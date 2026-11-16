-- Chiara CRM – baza (Supabase). Zalijepi cijelu datoteku u SQL Editor i klikni Run.
-- Svaka tablica ima: id (tekst), data (sadržaj retka kao JSON), updated_at.
-- Pristup imaju samo prijavljeni korisnici čiji je email u tablici "team".

create table if not exists public.team (
  email text primary key,
  name  text not null
);
alter table public.team enable row level security;
drop policy if exists team_self on public.team;
create policy team_self on public.team for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

do $$
declare t text;
begin
  foreach t in array array['properties','units','stays','stay_tasks','todos','recurring','leads','templates'] loop
    execute format('create table if not exists public.%I (id text primary key, data jsonb not null, updated_at timestamptz not null default now())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists team_all on public.%I', t);
    execute format('create policy team_all on public.%I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
