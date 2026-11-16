// Rentlio -> Notion most
// Vercel serverless funkcija: api/rentlio-webhook.js
// Adresa nakon objave: https://<vas-projekt>.vercel.app/api/rentlio-webhook
//
// Environment varijable u Vercelu:
//   NOTION_TOKEN            - osobni pristupni token iz Notiona
//   RENTLIO_WEBHOOK_TOKEN   - proizvoljna tajna rijec, ista se upisuje u Rentlio kod webhooka

// ---------------------------------------------------------------------------
// POSTAVKE - ovo se mijenja bez diranja ostatka koda
// ---------------------------------------------------------------------------

// Baza "Zadaci" u Notionu
const NOTION_DATABASE_ID = "41adcc57c3bb81c98be9c5c72a7011a3";

// Zadaci koji se stvaraju za svaku rezervaciju.
//   od:    "dolazak" ili "odlazak"
//   dani:  pomak u danima (-4 = cetiri dana prije)
//   osoba: "Marko", "Lea", "Vanja" ili null (ostaje u pogledu Nedodijeljeno)
const ZADACI = [
  { kljuc: "checkin-poruka", naziv: "Check-in poruka i zamolba za dokumente", od: "dolazak", dani: -4, osoba: null },
  { kljuc: "evisitor",       naziv: "Upis u eVisitor",                        od: "dolazak", dani: -1, osoba: null },
  { kljuc: "odlazak-poruka", naziv: "Poruka na odlasku",                      od: "odlazak", dani: 0,  osoba: null },
];

// Rentlio salje samo ID jedinice. Ovdje upisite nazive: { 12345: "Villa Mistral" }
const JEDINICE = {};

const ZONA = "Europe/Zagreb";

// ---------------------------------------------------------------------------

const NOVA = ["reservation-created", "ota-reservation-received"];
const IZMJENA = ["reservation-updated", "ota-reservation-modified"];
const OTKAZ = ["reservation-canceled", "ota-reservation-canceled"];

// Unix timestamp (UTC) -> "YYYY-MM-DD" po zagrebackom vremenu
export function datum(ts) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(ts * 1000));
}

function pomakni(iso, dani) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dani);
  return d.toISOString().slice(0, 10);
}

function lijepo(iso) {
  const [g, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${g}.`;
}

// Izracun svih zadataka za jednu rezervaciju
export function izracunaj(rez, danas) {
  const dolazak = datum(rez.arrivalDate);
  const odlazak = datum(rez.departureDate);
  const gost = (rez.guest && rez.guest.name) || "Gost";
  const jedinica = JEDINICE[rez.unitsId] || `jedinica ${rez.unitsId}`;
  const osoba = (rez.adults || 0) + (rez.childrenAbove12 || 0) + (rez.childrenUnder12 || 0);
  const napomena =
    `Dolazak ${lijepo(dolazak)}, odlazak ${lijepo(odlazak)}, ${jedinica}` +
    (osoba ? `, broj gostiju: ${osoba}` : "");

  return ZADACI.map((z) => {
    let rok = pomakni(z.od === "dolazak" ? dolazak : odlazak, z.dani);
    // Last minute rezervacija: rok je vec prosao, pa zadatak ide na danas
    if (rok < danas) rok = danas;
    return { kljuc: z.kljuc, naslov: `${z.naziv} – ${gost}`, rok, osoba: z.osoba, napomena };
  });
}

async function notion(put, metoda, tijelo) {
  const odgovor = await fetch(`https://api.notion.com/v1/${put}`, {
    method: metoda,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: tijelo ? JSON.stringify(tijelo) : undefined,
  });
  if (!odgovor.ok) {
    throw new Error(`Notion ${metoda} ${put}: ${odgovor.status} ${await odgovor.text()}`);
  }
  return odgovor.json();
}

// Svi zadaci u Notionu vezani uz jednu rezervaciju
async function postojeci(rezId) {
  const r = await notion(`databases/${NOTION_DATABASE_ID}/query`, "POST", {
    filter: { property: "Rezervacija", number: { equals: rezId } },
    page_size: 100,
  });
  return r.results;
}

function svojstva(rezId, z) {
  const s = {
    Zadatak: { title: [{ text: { content: z.naslov } }] },
    Firma: { select: { name: "Chiara" } },
    Tip: { select: { name: "Gosti" } },
    Ponavljanje: { select: { name: "Jednokratno" } },
    Rok: { date: { start: z.rok } },
    Napomena: { rich_text: [{ text: { content: z.napomena } }] },
    Rezervacija: { number: rezId },
    "Vrsta zadatka": { rich_text: [{ text: { content: z.kljuc } }] },
  };
  if (z.osoba) s["Odgovorna osoba"] = { select: { name: z.osoba } };
  return s;
}

const tekst = (stranica, polje) =>
  ((stranica.properties[polje] || {}).rich_text || []).map((t) => t.plain_text).join("");

// Nova ili izmijenjena rezervacija: stvori sto fali, azuriraj sto nije odradeno
async function uskladi(rez, danas) {
  const zeljeni = izracunaj(rez, danas);
  const stari = await postojeci(rez.id);
  let stvoreno = 0;
  let azurirano = 0;

  for (const z of zeljeni) {
    const stranica = stari.find((s) => tekst(s, "Vrsta zadatka") === z.kljuc);
    if (!stranica) {
      await notion("pages", "POST", {
        parent: { database_id: NOTION_DATABASE_ID },
        properties: svojstva(rez.id, z),
      });
      stvoreno++;
      continue;
    }
    // Odradene zadatke ne diramo, ni odgovornu osobu koju je netko rucno promijenio
    if (stranica.properties.Gotovo && stranica.properties.Gotovo.checkbox) continue;
    await notion(`pages/${stranica.id}`, "PATCH", {
      properties: {
        Zadatak: { title: [{ text: { content: z.naslov } }] },
        Rok: { date: { start: z.rok } },
        Napomena: { rich_text: [{ text: { content: z.napomena } }] },
      },
    });
    azurirano++;
  }
  return { stvoreno, azurirano };
}

// Otkazana rezervacija: neodradeni zadaci idu u Trash (mogu se vratiti)
async function otkazi(rezId) {
  const stari = await postojeci(rezId);
  let uklonjeno = 0;
  for (const s of stari) {
    if (s.properties.Gotovo && s.properties.Gotovo.checkbox) continue;
    await notion(`pages/${s.id}`, "PATCH", { archived: true });
    uklonjeno++;
  }
  return { uklonjeno };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ greska: "Samo POST" });

  const tijelo = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  if (!process.env.RENTLIO_WEBHOOK_TOKEN || tijelo.token !== process.env.RENTLIO_WEBHOOK_TOKEN) {
    return res.status(401).json({ greska: "Neispravan token" });
  }

  const dogadaj = tijelo.event || {};
  const rez = dogadaj.payload;
  if (!rez || !rez.id) return res.status(200).json({ preskoceno: "nema rezervacije" });

  try {
    const danas = datum(Math.floor(Date.now() / 1000));
    if (NOVA.includes(dogadaj.type) || IZMJENA.includes(dogadaj.type)) {
      return res.status(200).json(await uskladi(rez, danas));
    }
    if (OTKAZ.includes(dogadaj.type)) {
      return res.status(200).json(await otkazi(rez.id));
    }
    // check-in / check-out dogadaji iz Rentlija zasad se ne koriste
    return res.status(200).json({ preskoceno: dogadaj.type });
  } catch (e) {
    console.error(e);
    // Status 500 znaci da ce Rentlio pokusati ponovno za sat vremena
    return res.status(500).json({ greska: String(e.message || e) });
  }
}
