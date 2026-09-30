# Chiara CRM – plan i struktura baze

## 1. Što gradimo (sažetak)

Interna web aplikacija (radi i kao "app" na mobitelu – PWA) za Marka, Anu i Leu:

- **Gosti / boravci** – checklista, upozorenja, WhatsApp/Email predlošci, kalendar, arhiva
- **Opći to-do** – Kanban (Marko / Ana / Lea), prioriteti, rokovi, kategorije
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
  - `done` (bool), `done_by` (Marko/Ana/Lea), `done_at`
  - Upozorenje "dolazi za ≤ 2 dana": računa se u aplikaciji iz `check_in` + zadataka `id_received` i `evisitor`.

### Opći to-do
- **categories**: `id`, `name`, `color`
- **todos**: `id`, `title`, `description`, `assignee` (Marko/Ana/Lea), `due_date`, `priority` (`low` | `normal` | `high`), `category_id`, `done`, `done_by`, `done_at`, `sort_order`, `created_by`, `created_at`

### Postavke i korisnici
- **message_templates**: `id`, `kind` (`id_request` | `confirmation` | `custom`), `channel` (`whatsapp` | `email`), `language` (`hr`|`en`|`de`), `subject`, `body` – s oznakama tipa `{ime}`, `{datum_dolaska}`, `{objekt}`
- **team** (članovi): `user_id → auth.users`, `name` (Marko/Ana/Lea), `email`

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
5. **Zadaci** – Kanban Marko/Ana/Lea (drag & drop na računalu; na mobitelu izbornik "Prebaci na…"), filter "Moji", sakrij odrađene, istaknuti zakašnjeli
6. **Postavke** – objekti/jedinice, kategorije, predlošci poruka (HR/EN/DE)

Ključni vizuali (kako si opisao/la):
- neodrađeno: prazan checkbox; odrađeno: zeleni ✓, prekriženo, opacity 50%, "Ana · 12.5. 14:32"
- progress "3/4" u boji (crveno → zlatno → zeleno)
- zlatni/crveni badge: dolazak ≤ 2 dana, a osobne ili eVisitor nisu odrađeni
- Boje/fontovi: #011329, #68051A (hover #430512), #F8B42B, #F1F2F3, #949CA5, #4F5962; Playfair Display + Quicksand

## 6. Prijava – "tko sam ja"
Nakon prijave email → ime (Marko/Ana/Lea) preko tablice `team`. To se koristi za "označio Ana", "Moji zadaci" i `created_by`. U fazi A (lokalno) samo odabereš ime na vrhu.

## 7. Priprema za Rentlio
`stays.external_id` + `external_source` i "sloj za podatke" izdvojen u `src/data/` znači da će kasnije uvoz biti jedna nova funkcija (Supabase Edge Function) koja upisuje boravke – bez promjene sučelja.

## 8. Pitanja / pretpostavke (reci ako trebam promijeniti)
1. **Više gostiju/objekata u istom boravku** (npr. grupa u dvije jedinice) – pretpostavljam **jedan boravak = jedna jedinica**; grupa = dva boravka.
2. **"Upozorenje ≤ 2 dana"** – računam od danas do dana dolaska (uključujući danas).
3. **Vrijeme dolaska** – slobodan unos (npr. "oko 16h") jer je okvirno.
4. **Aplikacija na mobitelu** – dodajem PWA (ikona na početnom ekranu). OK?
5. **Predlošci poruka** – ja napišem početne tekstove na HR/EN/DE, ti ih poslije uređuješ u Postavkama.
