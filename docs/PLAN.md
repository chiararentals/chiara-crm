# Chiara CRM – plan i struktura baze

## 1. Što gradimo (sažetak)

Interna web aplikacija (radi i kao "app" na mobitelu – PWA) za Marka, Anu i Leu:

- **Gosti / boravci** – checklista, upozorenja, WhatsApp/Email predlošci, kalendar, arhiva
- **Opći to-do** – Kanban (Marko / Lea / Vanja), prioriteti, rokovi, kategorije
- Zajednički podaci u stvarnom vremenu (Supabase realtime), prijava magic linkom

## 2. Faze rada

| Faza | Što | Što ti trebaš napraviti |
|---|---|---|
| **A** | Aplikacija radi lokalno s testnim podacima (bez Supabasea) – vidiš dizajn i tijek rada | Samo pogledati i dati komentare |
| **B** | Spajanje na Supabase (baza + prijava + realtime) | Otvoriti besplatni Supabase račun, kopirati 2 ključa (vodič korak po korak) |
| **C** | Deploy na Vercel | Otvoriti besplatni Vercel račun, povezati GitHub (vodič korak po korak) |
| **D** | Dodatno: instalacija na mobitel (PWA), Rentlio uvoz kasnije | – |

Faza A koristi isti "sloj za podatke" kao i kasnije Supabase, pa se u fazi B mijenja samo jedna datoteka, a ne cijela aplikacija.

## 3. Struktura projekta

```
src/
  components/      # kartica boravka, checklista, kanban stupac, badgevi...
  pages/           # Danas, Boravci, Kalendar, Arhiva, Zadaci, Postavke
  data/            # "sloj za podatke": jedno mjesto koje priča s bazom
    localStore.js  #   faza A – testni podaci u pregledniku
    supabaseStore.js # faza B – prava baza + realtime
  lib/             # datumi, WhatsApp/mailto linkovi, predlošci poruka
  seed/            # unaprijed upisani objekti/jedinice i testni podaci
supabase/
  schema.sql       # cijela baza – jedan copy/paste u Supabase
docs/
  PLAN.md, UPUTE-SUPABASE.md, UPUTE-VERCEL.md
```

Tehnologija: React + Vite + Tailwind, React Router, `@dnd-kit` (drag & drop, radi i na dodir), `date-fns` (hrvatski datumi), `@supabase/supabase-js`.

## 4. Struktura baze (Supabase / PostgreSQL)

Nema nikakvih podataka o osobnim iskaznicama – samo statusi (kvačice).

### Objekti i jedinice
- **properties** (objekti): `id`, `name`, `sort_order`
- **units** (jedinice): `id`, `property_id → properties`, `name`, `sort_order`, `note` (npr. "veliki/mali")
  - Objekt bez podjedinica (npr. Apartman Ida) dobiva jednu jedinicu istog imena – tako svaki boravak uvijek pokazuje na jedinicu, a kalendar je jednostavan.

### Boravci
- **stays**
  - `id`, `unit_id → units`
  - `guest_name`, `adults`, `children`
  - `check_in` (date), `arrival_time` (tekst/vrijeme, okvirno), `check_out` (date)
  - `source` (`booking` | `airbnb` | `rentlio_direct` | `other`)
  - `phone`, `email`, `notes`, `language` (`hr` | `en` | `de` – za predložak poruke)
  - **`external_id`, `external_source`** – prazno za sada; kasnije Rentlio uvoz (ista rezervacija se ne duplicira)
  - `created_by`, `created_at`, `updated_at`

### Checklista boravka
- **stay_tasks**
  - `id`, `stay_id → stays` (briše se s boravkom)
  - `kind` (`confirmation` | `id_request` | `id_received` | `evisitor` | `custom`) – 4 standardna zadatka se automatski stvaraju za svaki novi boravak
  - `title`, `sort_order`
  - `done` (bool), `done_by` (Marko/Lea/Vanja), `done_at`
  - Upozorenje "dolazi za ≤ 2 dana": računa se u aplikaciji iz `check_in` + zadataka `id_received` i `evisitor`.

### Opći to-do
- **categories**: `id`, `name`, `color`
- **todos**: `id`, `title`, `description`, `assignee` (Marko/Lea/Vanja), `due_date`, `priority` (`low` | `normal` | `high`), `category_id`, `done`, `done_by`, `done_at`, `sort_order`, `created_by`, `created_at`

### Postavke i korisnici
- **message_templates**: `id`, `kind` (`id_request` | `confirmation` | `custom`), `channel` (`whatsapp` | `email`), `language` (`hr`|`en`|`de`), `subject`, `body` – s oznakama tipa `{ime}`, `{datum_dolaska}`, `{objekt}`
- **team** (članovi): `user_id → auth.users`, `name` (Marko/Lea/Vanja), `email`

### Sigurnost (Row Level Security)
- Sve tablice zaključane; čitanje/pisanje samo ako je email prijavljenog korisnika u tablici **team** (tvoja 3 emaila).
- Magic link šalje se samo za te emailove (ostali se ne mogu registrirati – isključujemo javnu registraciju u Supabaseu).
- Realtime uključen na `stays`, `stay_tasks`, `todos`.

## 5. Ekrani

Donja navigacija na mobitelu (5 ikona), bočni izbornik na računalu:

1. **Danas i sutra** *(početna)* – dolasci i odlasci, badge upozorenja, brze akcije
2. **Boravci** – lista + pretraga po imenu + filteri (objekt, datum, samo neodrađeni zadaci)
3. **Kalendar** – timeline po jedinicama, grupirano po objektu, horizontalni scroll na mobitelu
4. **Arhiva** – prošli boravci
5. **Zadaci** – Kanban Marko/Lea/Vanja (drag & drop na računalu; na mobitelu izbornik "Prebaci na…"), filter "Moji", sakrij odrađene, istaknuti zakašnjeli
6. **Postavke** – objekti/jedinice, kategorije, predlošci poruka (HR/EN/DE)

Ključni vizuali (kako si opisao/la):
- neodrađeno: prazan checkbox; odrađeno: zeleni ✓, prekriženo, opacity 50%, "Vanja · 12.5. 14:32"
- progress "3/4" u boji (crveno → zlatno → zeleno)
- zlatni/crveni badge: dolazak ≤ 2 dana, a osobne ili eVisitor nisu odrađeni
- Boje/fontovi: #011329, #68051A (hover #430512), #F8B42B, #F1F2F3, #949CA5, #4F5962; Playfair Display + Quicksand

## 6. Prijava – "tko sam ja"
Nakon prijave email → ime (Marko/Lea/Vanja) preko tablice `team`. To se koristi za "označila Vanja", "Moji zadaci" i `created_by`. U fazi A (lokalno) samo odabereš ime na vrhu.

## 7. Priprema za Rentlio
`stays.external_id` + `external_source` i "sloj za podatke" izdvojen u `src/data/` znači da će kasnije uvoz biti jedna nova funkcija (Supabase Edge Function) koja upisuje boravke – bez promjene sučelja.

## 8. Pitanja / pretpostavke (reci ako trebam promijeniti)
1. **Više gostiju/objekata u istom boravku** (npr. grupa u dvije jedinice) – pretpostavljam **jedan boravak = jedna jedinica**; grupa = dva boravka.
2. **"Upozorenje ≤ 2 dana"** – računam od danas do dana dolaska (uključujući danas).
3. **Vrijeme dolaska** – slobodan unos (npr. "oko 16h") jer je okvirno.
4. **Aplikacija na mobitelu** – dodajem PWA (ikona na početnom ekranu). OK?
5. **Predlošci poruka** – ja napišem početne tekstove na HR/EN/DE, ti ih poslije uređuješ u Postavkama.

---

# 10. DOPUNA (v2): tim, Kupci, Pregled rada

## 10.1 Tim
**Marko, Lea, Vanja** (Ana više nije u timu). Svi troje vide sve – goste, zadatke i kupce. Kanban ima 3 stupca: Marko, Lea, Vanja.

## 10.2 Novi dio: Kupci (prodaja nekretnina, DUX nekretnine)
Nekretnine ostaju u internoj bazi DUX-a – **ne prepisujemo ih** u CRM. U CRM-u se samo bilježi **ID nekretnine iz DUX-a** (+ kratka bilješka po želji).

### Nove tablice
- **buyers** (kupci)
  - `id`, `full_name`, `phone`, `email`, `language` (hr/en/de), `country`, `source` (DUX web, preporuka, društvene mreže, portal, ostalo)
  - `budget_min`, `budget_max` (EUR), `looking_for_type` (stan/kuća/vila/zemljište/drugo), `looking_for_location`, `notes`
  - `status`: `novi` → `u_kontaktu` → `dolazi_gledati` → `pogledao` → `ponuda` → `kupio` / `odustao`
  - `owner` (tko vodi kupca; zadano Vanja)
  - **4 ključna odgovora (trenutno stanje, osvježava se pri svakom follow-upu):**
    1. `last_sent` – što mu je zadnje poslano
    2. `arrival_date` + `arrival_note` – kad potencijalno dolazi u Hrvatsku ("još ne zna" je dozvoljeno)
    3. `viewed_manual` – ručno upisani broj pogledanih nekretnina (ukupni broj = ručni + oni s popisa ispod)
    4. izabrana nekretnina za gledanje = viewings sa statusom `planned`
  - `tracked_since` (datum od kojeg pratimo kašnjenje – vidi 10.5), `created_by`, `created_at`
- **buyer_viewings** (nekretnine kupca)
  - `id`, `buyer_id`, `dux_id` (ID iz DUX baze), `note`, `status` (`planned` = izabrana za gledanje | `viewed` = pogledana), `viewed_on`
  - Broj pogledanih = `viewed_manual` + broj redaka sa statusom `viewed` (aplikacija računa i pokazuje "5 = 3 s popisa + 2 ručno").
- **buyer_contacts** (dnevnik kontakata – povijest, i izvor za kalendar)
  - `id`, `buyer_id`, `contacted_by`, `contacted_at`, `channel` (WhatsApp/email/poziv/ostalo)
  - `sent_text` (što je poslano), `arrival_date`, `arrival_note`, `viewed_count` i `chosen_ids` (snimka stanja u tom trenutku), `followup_id`
- **todos** dobiva dva polja: `buyer_id` (prazno za obične zadatke) i `kind` (`task` | `followup`). Follow-up je običan zadatak, pa se automatski pojavljuje u Kanbanu u stupcu osobe, u "Moji zadaci", s isticanjem kašnjenja – i na profilu kupca.
- **settings**: `followup_default_days` (zadano 7, mijenja se u Postavkama).

### Što se događa kad se follow-up označi kao odrađen
Umjesto običnog kvačenja otvara se kratki obrazac (mobitel: preko cijelog ekrana):
1. **Što je poslano** (obavezno) + kanal
2. **Kad dolazi u Hrvatsku** (datum, ili "još ne zna" + bilješka)
3. **Koliko je nekretnina pogledao** – ručni broj i/ili dodavanje ID-ova iz DUX-a
4. **Izabrana nekretnina za gledanje** – ID(ovi) iz DUX-a, ili "još nije izabrao"
5. **Sljedeći follow-up:** datum je unaprijed predložen (danas + 7 dana), može se promijeniti ili preskočiti
Tek nakon toga zadatak postaje odrađen (zeleno, prekriženo, 50%, "Vanja · 12.5. 14:32"), nastaje redak u `buyer_contacts` i osvježava se stanje kupca. Kontakt se može zabilježiti i bez zadatka ("Zabilježi kontakt").

## 10.3 Novi ekrani
- **Kupci** (u izborniku): lista/tablica s pretragom i filterima (status, osoba, "treba follow-up"). Tablica ima **stupce s 4 odgovora** (poslano · dolazi · pogledao · izabrano), na mobitelu kartice sa istim podacima.
  - **Mali mjesečni kalendar:** točkice na danima kad je netko kontaktiran; klik na dan = tko je koga kontaktirao i što je poslano; filter po osobi.
  - **Izvoz u Excel (.xlsx)** trenutno filtrirane liste (za sastanke).
- **Profil kupca:** podaci, 4 odgovora na vrhu, popis nekretnina (DUX ID-ovi), povijest svih kontakata, otvoreni follow-upi.
- **Pregled "treba follow-up"** (na vrhu Kupaca): kupci s zakašnjelim follow-upom ili bez kontakta 7+ dana, crveno istaknuti.

## 10.4 Novi ekran: Pregled rada (dashboard)
Da Marko (ili tko god) uđe i vidi što su Lea i Vanja napravile:
- Odabir razdoblja: **Danas · Jučer · Ovaj tjedan (zadano) · Prošli tjedan · Vlastiti datumi**
- Kartica po osobi: odrađeni follow-upi (i broj kontaktiranih kupaca), odrađeni opći zadaci, odrađene stavke checkliste boravaka, novi kupci i boravci
- **Tjedni sažetak:** kupci po fazama (koliko ih je u kojem statusu), broj kontakata, zakašnjeli zadaci po osobi
- Popis aktivnosti (tko, što, kad) za odabrano razdoblje
- Gumb "Kopiraj sažetak" (tekst za WhatsApp/mail)
Podaci se računaju iz onoga što već bilježimo (tko je i kada označio), pa nema dodatnog posla za tim.

## 10.5 Postojeći kupci ne smiju odmah "kasniti"
Kašnjenje se računa tek **od `tracked_since`**, ne od starih datuma. Kad uvezemo postojeće kupce, `tracked_since` = dan uvoza, a prvi follow-up se postavlja unaprijed (zadano +7 dana ili datum iz tablice). Zato nitko od starih kupaca ne ispada crven odmah, a stvarni propusti se vide tek od uvoza nadalje. Uvoz: iz Excela/CSV-a s popisom kupaca (korak pri puštanju u rad).

## 10.6 Redoslijed rada
- **A2:** Kupci + Pregled rada + izvoz u lokalnoj verziji s testnim podacima; Ana → Vanja u testnim podacima (osvježavamo Vercel link)
- **B:** Supabase za sve (`schema.sql` uključuje i kupce), prijava za Marka, Leu i Vanju
- **C:** uvoz postojećih kupaca iz Excela
- **D (kasnije):** obavijesti (mobitel/email), PWA ikona, Rentlio
