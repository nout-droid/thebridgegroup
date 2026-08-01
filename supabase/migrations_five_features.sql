-- Vijf nieuwe features, in één keer uit te voeren in de Supabase SQL Editor.

-- ========== 1. Op-/afbouwtijden per leverancier ==========
-- Vrij tekstveld (bv. "08:00") per offerte-regel (leverancier x categorie), zodat de
-- leverancier in zijn portal precies ziet wanneer hij verwacht wordt.
alter table public.quotes add column if not exists load_in_time text;
alter table public.quotes add column if not exists load_out_time text;

-- ========== 2. Weer-widget ==========
-- Geen SQL nodig — gebruikt de gratis Open-Meteo API (geen API-key) op basis van
-- venues.address, zie src/lib/server/weather.ts + /api/weather/[token].

-- ========== 3. Incident-/schademeldingen ==========
-- Crew kan tijdens op-/afbouw of show een melding (+ optioneel foto) toevoegen. Foto's
-- gaan naar de bestaande privé "portal-documents"-bucket, zelfde patroon als
-- parking_passes/guest_documents.
create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  division text not null default '',
  description text not null,
  photo_path text,
  reported_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists incident_reports_project_id_idx on public.incident_reports(project_id);

alter table public.incident_reports enable row level security;

drop policy if exists "owner full access on incident_reports" on public.incident_reports;
create policy "owner full access on incident_reports" on public.incident_reports
  for all using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));

-- ========== 4. Lost & found (gastenportaal) ==========
create table if not exists public.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null,
  photo_path text,
  status text not null default 'lost' check (status in ('lost', 'found', 'claimed')),
  created_at timestamptz not null default now()
);

create index if not exists lost_found_items_project_id_idx on public.lost_found_items(project_id);

alter table public.lost_found_items enable row level security;

drop policy if exists "owner full access on lost_found_items" on public.lost_found_items;
create policy "owner full access on lost_found_items" on public.lost_found_items
  for all using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));

-- ========== 5. Leveranciersbeoordeling ==========
-- Eén beoordeling per leverancier per project, ingevuld door de organisator (bv. op de
-- evaluatiepagina na afloop). Gemiddelde wordt getoond op /suppliers.
create table if not exists public.supplier_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, supplier_id)
);

create index if not exists supplier_ratings_supplier_id_idx on public.supplier_ratings(supplier_id);

alter table public.supplier_ratings enable row level security;

drop policy if exists "owner full access on supplier_ratings" on public.supplier_ratings;
create policy "owner full access on supplier_ratings" on public.supplier_ratings
  for all using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));
