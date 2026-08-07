-- Tafelindeling: gasten koppelen aan een tafel/zaal-indeling, met name & capaciteit per
-- tafel. Vooral relevant bij seated diners (net toegevoegd via catering gasten-stijl
-- "seated") — bruiloften/gala's moeten weten wie waar zit. Een gast zit aan hooguit één
-- tafel, dus dit is een eenvoudige nullable FK op event_guests, geen aparte join-tabel.

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  name text not null default '',
  capacity int not null default 8,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists seating_tables_project_id_idx on public.seating_tables(project_id);
create index if not exists seating_tables_stage_id_idx on public.seating_tables(stage_id);

alter table public.seating_tables enable row level security;

drop policy if exists "owner full access on seating_tables" on public.seating_tables;
create policy "owner full access on seating_tables" on public.seating_tables
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

alter table public.event_guests add column if not exists table_id uuid references public.seating_tables(id) on delete set null;
create index if not exists event_guests_table_id_idx on public.event_guests(table_id);
