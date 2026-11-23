-- Vile (Bonvia) + dokumenti – jednokratno. Zalijepi cijelo u Supabase → SQL Editor → New query → Run.
-- Siguran je za ponovno pokretanje (ništa ne briše).

-- 1) Tablica vila (isti oblik kao ostale: id, data, updated_at), zaštićena kao i ostale tablice
create table if not exists public.villas (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
alter table public.villas enable row level security;
drop policy if exists team_all on public.villas;
create policy team_all on public.villas for all to authenticated using (public.is_team()) with check (public.is_team());
grant select, insert, update, delete on public.villas to authenticated;
grant all on public.villas to service_role;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'villas') then
    alter publication supabase_realtime add table public.villas;
  end if;
end $$;

-- 2) Privatni spremnik za dokumente (ugovori u PDF-u); vide ga samo članovi tima
insert into storage.buckets (id, name, public) values ('ugovori', 'ugovori', false) on conflict (id) do nothing;
drop policy if exists "ugovori team select" on storage.objects;
drop policy if exists "ugovori team insert" on storage.objects;
drop policy if exists "ugovori team update" on storage.objects;
drop policy if exists "ugovori team delete" on storage.objects;
create policy "ugovori team select" on storage.objects for select to authenticated using (bucket_id = 'ugovori' and public.is_team());
create policy "ugovori team insert" on storage.objects for insert to authenticated with check (bucket_id = 'ugovori' and public.is_team());
create policy "ugovori team update" on storage.objects for update to authenticated using (bucket_id = 'ugovori' and public.is_team()) with check (bucket_id = 'ugovori' and public.is_team());
create policy "ugovori team delete" on storage.objects for delete to authenticated using (bucket_id = 'ugovori' and public.is_team());
