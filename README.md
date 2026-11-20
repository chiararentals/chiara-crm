# Chiara CRM

Interni CRM tracker za Chiara Apartments & Villas, Bonvia i Dux nekretnine (React + Vite + Tailwind + Supabase).

## Što sve ima
- **Danas**, **Zadaci** (Kanban Marko / Lea / Vanja), **Boravci**, **Arhiva**
- **Kupci i leadovi** (Dux / Bonvia): follow-up, 4 ključna odgovora, DUX ID-ovi nekretnina, povijest kontakata, kalendar kontakata, izvoz u Excel, uvoz iz dnevne tablice
- **Pregled rada**: što je tko napravio u odabranom razdoblju

## Kupci – kako radi
- Follow-up kupca pojavi se u Zadacima u stupcu voditelja (zadano Vanja) kad mu je rok danas ili je prošao.
- "Follow-up odrađen" traži 4 odgovora: što je poslano, kad dolazi u HR, koliko je pogledao, je li izabrao nekretninu. Rok sljedećeg follow-upa se predlaže (vruć +4, topao +7 dana) i može se promijeniti.
- Kontakti i nekretnine spremaju se unutar zapisa kupca (nema dodatnih tablica u bazi).
- Uvoz iz Excela (list "Kupci"): uvoze se samo vrući i topli; kupac se prepoznaje po emailu, pa telefonu, pa imenu; što je upisano u CRM ostaje; stari rokovi iz tablice se preskaču.

## Pokretanje na računalu
`npm install`, zatim `npm run dev`. Bez Supabase ključeva podaci se spremaju samo u pregledniku.
Spajanje na Supabase: `docs/UPUTE-SUPABASE.md`. Plan i struktura: `docs/PLAN.md`.
