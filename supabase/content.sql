-- Content plan (kalendar objava) – jednokratno. Supabase → SQL Editor → New query → zalijepi sve → Run.
-- Siguran je za ponovno pokretanje (ništa ne briše).
create table if not exists public.content (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
alter table public.content enable row level security;
drop policy if exists team_all on public.content;
create policy team_all on public.content for all to authenticated using (public.is_team()) with check (public.is_team());
grant select, insert, update, delete on public.content to authenticated;
grant all on public.content to service_role;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'content') then
    alter publication supabase_realtime add table public.content;
  end if;
end $$;
