# Vile (Bonvia): baza vila i dokumenti (jednokratna priprema)

Stranica **Vile** (u izborniku kad je odabrana firma Bonvia ili "Sve firme") čuva: ime ville, lokaciju, vlasnika, telefon i email, status, datum potpisa i važenja ugovora, napomene i **dokumente (PDF ugovori)**.

Treba jednom pokrenuti SQL (nova tablica i privatni spremnik za dokumente):

1. Supabase → vaš projekt → **SQL Editor** → **New query**.
2. Zalijepite cijeli sadržaj datoteke `supabase/vile.sql`.
3. Kliknite **Run**. Mora pisati **Success**.
4. Osvježite CRM. Upozorenje na stranici Vile nestaje i može se dodavati vile i učitavati dokumente.

Do tada CRM radi normalno, samo stranica Vile ne sprema podatke.

Dokumenti se spremaju u privatni spremnik **ugovori** (do 25 MB po datoteci). Otvaraju se putem privremene veze koja vrijedi 5 minuta; vide ih samo članovi tima koji su prijavljeni u CRM.
