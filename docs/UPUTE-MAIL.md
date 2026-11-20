# Automatsko čitanje upita iz maila (Duxov sandučić → CRM)

Servis `api/mail-sync.js` svako jutro (05:00 UTC) pročita **samo čitanjem** (IMAP, ne mijenja ništa u sandučiću) mailove iz zadnjih 3 dana, prepozna upite portala i upiše ih u CRM kao kupce s oznakom **"Novo – provjeri"**.

## Što prepoznaje
| Izvor | Što se čita |
|---|---|
| Njuškalo (`noreply@njuskalo.hr`) | email kupca (Reply-To), interna šifra = ID oglasa, cijena, tekst upita, telefon i ime iz teksta ako postoje |
| LuxuryEstate (`noreply@luxuryestate.com`) | ID, email, ime, tekst, jezik |
| nekretnine.hr, Indomio, Nekretnine Kvarner | općeniti čitač (email, šifra, tekst) – dok ne vidimo stvarne primjere |

Preskače se: **najam** (osim ako `INCLUDE_RENTALS=1`), obavijesti „Novi rezultati koji odgovaraju vašoj pretrazi”, vlastiti mailovi, nepoznati pošiljatelji. Kupac koji već postoji (isti email, pa telefon) se **osvježi** (zadnja komunikacija, novi ID oglasa), a njegov rok follow-upa i sve što je upisano u CRM ostaje.

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
| `OWN_PHONES` | (po želji) telefoni agenata i tvrtke, odvojeni zarezom, da se ne pročitaju kao kupčevi |

Nakon unosa: **Deployments → Redeploy**.

## Prvi test (bez upisivanja)
U pregledniku otvorite (ili `curl`-om, s zaglavljem `Authorization: Bearer <CRON_SECRET>`):
`https://<vaša-adresa>/api/mail-sync?dry=1&days=7`
Odgovor je brojač: koliko mailova pročitano, koliko novih kupaca, koliko preskočeno i zašto, i popis nepoznatih pošiljatelja (samo domena i naslov). `dry=1` ništa ne upisuje. Ako ne piše greška, isti poziv bez `dry=1` upisuje.

## Ako ne radi
- `Mail server: …` – server odbija prijavu (pogrešna lozinka, ili zaštita od upada blokira adresu Vercela; tada IT treba dopustiti pristup).
- `Nedostaju postavke: …` – nije upisana neka od gore navedenih.
- `Neovlašteno` – zaglavlje `Authorization` ne odgovara `CRON_SECRET`.
