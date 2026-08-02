-- Documenten/tekeningen per locatie (bv. plattegronden, technische specs van de venue-eigenaar),
-- zelfde opzet als project_documents maar dan gekoppeld aan een locatie i.p.v. een project.
create table if not exists public.venue_documents (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  title text not null,
  storage_path text not null,
  original_filename text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists venue_documents_venue_id_idx on public.venue_documents(venue_id);

alter table public.venue_documents enable row level security;

drop policy if exists "team members can view/edit venue_documents" on public.venue_documents;
create policy "team members can view/edit venue_documents" on public.venue_documents
  for all using (
    exists (select 1 from public.venues v where v.id = venue_id and public.is_team_member(v.user_id))
  ) with check (
    exists (select 1 from public.venues v where v.id = venue_id and public.is_team_member(v.user_id))
  );
