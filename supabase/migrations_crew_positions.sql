-- Crew Planning: per dag/functie vastleggen hoeveel mensen nodig zijn en wie ze levert,
-- vóórdat namen bekend zijn. Koppelt automatisch aan de bestaande accreditatielijst
-- (crew_members) zodra "accreditatie nodig" wordt aangevinkt. Voer dit één keer uit in
-- de Supabase SQL Editor.

create table if not exists public.crew_positions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  work_date date not null,
  role text not null default '',
  quantity int not null default 1,
  provided_by text not null default 'wij' check (provided_by in ('wij', 'klant', 'leverancier')),
  supplier_id uuid references public.suppliers(id) on delete set null,
  needs_accreditation boolean not null default false,
  needs_catering boolean not null default false,
  needs_hotel boolean not null default false,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists crew_positions_project_id_idx on public.crew_positions(project_id);

alter table public.crew_positions enable row level security;

drop policy if exists "owner full access on crew_positions" on public.crew_positions;
create policy "owner full access on crew_positions" on public.crew_positions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- Crew Planning + Artiestenriders-eigen-crew (Deel 2) delen dit datamodel op crew_members.
alter table public.crew_members add column if not exists crew_position_id uuid references public.crew_positions(id) on delete set null;
alter table public.crew_members add column if not exists artist_rider_id uuid references public.artist_riders(id) on delete set null;
alter table public.crew_members add column if not exists needs_catering boolean not null default false;
alter table public.crew_members add column if not exists needs_hotel boolean not null default false;

create index if not exists crew_members_crew_position_id_idx on public.crew_members(crew_position_id);
create index if not exists crew_members_artist_rider_id_idx on public.crew_members(artist_rider_id);
