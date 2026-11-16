# Spajanje CRM-a na Supabase (korak po korak)

Bez ovoga CRM sprema podatke samo u pregledniku. S ovim su podaci na serveru, isti za sve i na svakom uređaju.

## 1. Baza (SQL)
1. Supabase → projekt **CRM** → lijevo **SQL Editor** → **New query**.
2. Zalijepi cijeli sadržaj datoteke `supabase/schema.sql` i klikni **Run**. Mora pisati "Success".

## 2. Tim (tko smije ući)
U novom SQL upitu zamijeni emailove stvarnima i klikni **Run**:

```sql
insert into public.team (email, name) values
  ('marko@primjer.hr', 'Marko'),
  ('lea@primjer.hr',   'Lea'),
  ('vanja@primjer.hr', 'Vanja')
on conflict (email) do update set name = excluded.name;
```

Imena moraju biti točno **Marko**, **Lea**, **Vanja**.

## 3. Korisnici i lozinke
1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Upiši email i lozinku, uključi **Auto Confirm User**, spremi. Ponovi za svih troje.
3. **Authentication** → **Sign In / Providers** → **Email**: isključi **Allow new users to sign up** (da se nitko drugi ne može registrirati).

## 4. Ključevi u Vercel
1. Supabase → **Project Settings** → **API Keys**. Treba ti **Project URL** i **publishable (anon) ključ**.
   Nikad ne koristi `service_role` / secret ključ.
2. Vercel → projekt **chiara-crm** → **Settings** → **Environment Variables**:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = publishable (anon) ključ
3. **Deployments** → ⋯ na zadnjoj objavi → **Redeploy** (varijable se ugrađuju pri izgradnji).

## 5. Prvi put
Otvori adresu, prijavi se emailom i lozinkom. Prvi korisnik koji uđe automatski upiše objekte, jedinice i svakodnevne zadatke. Zatim u **Kupci** klikni **Uvoz iz Excela** (jednom, za sve).

## Napomene
- Zaštita podataka: samo prijavljeni korisnici čiji je email u tablici `team` mogu čitati i pisati (Row Level Security).
- Besplatni plan baze se pauzira nakon otprilike tjedan dana bez prometa; u Supabaseu ga jednim klikom ponovno pokreneš.
- "Vrati testne podatke" u Postavkama nije dostupno kad je baza spojena.
