-- Crew planning per podium/area + meerdere uitvoerders (leveranciers) per draaiboek-regel.
-- Voer dit één keer uit in de Supabase SQL Editor.

-- 1. Crew planning krijgt een optioneel podium/area (leeg = projectbreed)
alter table public.crew_positions add column if not exists stage_id uuid references public.stages(id) on delete set null;
create index if not exists crew_positions_stage_id_idx on public.crew_positions(stage_id);

-- 2. Draaiboek: meerdere uitvoerders per activiteit i.p.v. één
create table if not exists public.schedule_item_suppliers (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null references public.schedule_items(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (schedule_item_id, supplier_id)
);

create index if not exists schedule_item_suppliers_item_id_idx on public.schedule_item_suppliers(schedule_item_id);
create index if not exists schedule_item_suppliers_supplier_id_idx on public.schedule_item_suppliers(supplier_id);

alter table public.schedule_item_suppliers enable row level security;

drop policy if exists "owner full access on schedule_item_suppliers" on public.schedule_item_suppliers;
create policy "owner full access on schedule_item_suppliers" on public.schedule_item_suppliers
  for all using (
    exists (
      select 1 from public.schedule_items si
      join public.projects p on p.id = si.project_id
      where si.id = schedule_item_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.schedule_items si
      join public.projects p on p.id = si.project_id
      where si.id = schedule_item_id and public.has_project_access(p.id)
    )
  );

-- bestaande enkele koppelingen overzetten naar de nieuwe koppeltabel
insert into public.schedule_item_suppliers (schedule_item_id, supplier_id)
select id, supplier_id from public.schedule_items where supplier_id is not null
on conflict (schedule_item_id, supplier_id) do nothing;

alter table public.schedule_items drop column if exists supplier_id;
