# Automatsko čitanje upita iz maila (Duxov sandučić → CRM)

Servis `api/mail-sync.js` svako jutro (05:00 UTC) pročita **samo čitanjem** (IMAP, ne mijenja ništa u sandučiću) mailove iz zadnjih 3 dana, prepozna upite portala i upiše ih u CRM kao kupce s oznakom **"Novo – provjeri"**.

## Što prepoznaje
| Izvor | Što se čita |
|---|---|
| Njuškalo (`noreply@njuskalo.hr`) | email kupca (Reply-To), interna šifra = ID oglasa, cijena, tekst upita, telefon i ime iz teksta ako postoje |
| LuxuryEstate (`noreply@luxuryestate.com`) | ID, email, ime, tekst, jezik |
| Indomio („Klijent je zainteresiran za Vašu nekretninu!”) | naš ID (#…), naziv i cijena oglasa, ime, telefon, email, poruka |
| Kvadratko („Novi upit kupca za vaš oglas”) | poruka, naziv oglasa, šifra objekta, ime, email, telefon (ako je upisan) |
| nekretnine.hr, Nekretnine Kvarner, web obrazac | općeniti čitač (email, šifra, tekst) – dok ne vidimo stvarne primjere |

Izvor se prepoznaje po pošiljatelju, a ako on nije poznat, po tipičnom tekstu maila.

**Najam se uvozi** (kupac dobiva tip „najam”; preskače se samo ako postavite `SKIP_RENTALS=1`). Preskače se: obavijesti „Novi rezultati koji odgovaraju vašoj pretrazi”, vlastiti mailovi, nepoznati pošiljatelji. Kupac koji već postoji (isti email, pa telefon) se **osvježi** (zadnja komunikacija, novi ID oglasa), a njegov rok follow-upa i sve što je upisano u CRM ostaje.

## Prijedlozi: dopisivanje s ljudima koji nisu poslali upit preko portala
Ako vam netko napiše (ili vi napišete njemu) s privatne adrese (gmail, outlook, hotmail, yahoo, gmx, libero…), a još nije u CRM-u, pojavit će se u CRM-u u odjeljku **„Prijedlozi iz maila: dodati u CRM?”** s gumbima **Dodaj kao kupca / Dodaj kao vlasnika / Ignoriraj**. Ništa se ne dodaje samo. Preskaču se vlastite adrese, portali, noreply/info/office adrese i reklame; poslovne domene se ne predlažu (osim uz `SUGGEST_ALL=1`). Najviše 15 prijedloga po pokretanju.

## Poslani mailovi = odrađen follow-up
Servis čita i mapu **Poslano**. Ako je mail poslan kupcu koji je u CRM-u (isti email), upisuje se kontakt: tko (ime iz potpisa u mailu: Marko, Lea ili Vanja; ako se ne prepozna, `SENT_AS_NAME`, zadano Vanja), kada, što je napisano (bez citirane povijesti), a rok sljedećeg follow-upa se računa od dana slanja (vruć +4, topao +7). Kupac dobiva oznaku **„Dopuni podatke”**, jer ostala tri odgovora (kad dolazi, koliko je pogledao, izabrane nekretnine) mail sam ne sadrži; upisuju se kroz „Samo upiši podatke”. Odgovori kupaca iz njihovih mailova osvježavaju „zadnju komunikaciju”.

## Postavke (Vercel → projekt → Settings → Environment Variables)
| Ime | Vrijednost |
|---|---|
| `MAIL_HOST` | `mail.` + vaša domena (kao u Outlooku, IMAP) |
| `MAIL_PORT` | `993` |
| `MAIL_USER` | `marko@dux-nekretnine.hr` |
| `MAIL_PASS` | lozinka sandučića (**samo ovdje**, nikad u chat ni u kod) |
| `SUPABASE_URL` | adresa projekta (Supabase → Project Settings → API) |
| `SUPABASE_SERVICE_KEY` | **service_role** ključ (isto mjesto; tajan, samo u Vercelu) |
| `CRON_SECRET` | bilo koja duga nasumična riječ (štiti adresu servisa) |
| `SENT_AS_NAME` | (po želji) ime koje se bilježi kad se u potpisu ne prepozna nitko, zadano `Vanja` |
| `OWN_PHONES` | (po želji) telefoni agenata i tvrtke, odvojeni zarezom, da se ne pročitaju kao kupčevi |

Nakon unosa: **Deployments → Redeploy**.

## Prvi test (bez upisivanja)
U pregledniku otvorite:
`https://<vaša-adresa>/api/mail-sync?key=<CRON_SECRET>&dry=1&days=7`
Odgovor je brojač: koliko mailova pročitano, koliko novih kupaca, koliko preskočeno i zašto, i popis nepoznatih pošiljatelja (samo domena i naslov). `dry=1` ništa ne upisuje. Ako ne piše greška, isti poziv bez `dry=1` upisuje.

## Ako ne radi
- `Mail server: …` – server odbija prijavu (pogrešna lozinka, ili zaštita od upada blokira adresu Vercela; tada IT treba dopustiti pristup).
- `Nedostaju postavke: …` – nije upisana neka od gore navedenih.
- `Neovlašteno` – `key` u adresi ne odgovara `CRON_SECRET`.
