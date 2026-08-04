-- Eigen materiaalbeheer: een centrale, project-overstijgende inventaris van materiaal dat
-- wij zelf bezitten en meenemen (dus NIET gehuurd van een leverancier — dat blijft
-- equipment_reservations). Zelfde patroon als freelancers: één record per item met een
-- interne dagprijs, en losse boekingen per project die de kosten weer in de begroting laten
-- landen (zie syncEquipmentCostCategory) en een pakbon-PDF opleveren.
create table if not exists public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '',
  asset_number text not null default '',
  quantity_owned int not null default 1,
  internal_day_rate numeric not null default 0,
  replacement_value numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists equipment_items_user_id_idx on public.equipment_items(user_id);

alter table public.equipment_items enable row level security;

drop policy if exists "team members can view equipment_items" on public.equipment_items;
create policy "team members can view equipment_items" on public.equipment_items
  for select using (public.is_team_member(user_id));
drop policy if exists "team members can insert equipment_items" on public.equipment_items;
create policy "team members can insert equipment_items" on public.equipment_items
  for insert with check (public.is_team_member(user_id));
drop policy if exists "team members can update equipment_items" on public.equipment_items;
create policy "team members can update equipment_items" on public.equipment_items
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
drop policy if exists "team admins can delete equipment_items" on public.equipment_items;
create policy "team admins can delete equipment_items" on public.equipment_items
  for delete using (public.is_team_admin(user_id));

grant select, insert, update, delete on public.equipment_items to authenticated;

-- Boeking = hoeveel van dit item, welke dagen, voor welk project (en optioneel podium).
-- has_project_access bepaalt toegang, zelfde als crew_members/equipment_reservations.
create table if not exists public.equipment_bookings (
  id uuid primary key default gen_random_uuid(),
  equipment_item_id uuid not null references public.equipment_items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  quantity int not null default 1,
  access_dates date[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists equipment_bookings_item_id_idx on public.equipment_bookings(equipment_item_id);
create index if not exists equipment_bookings_project_id_idx on public.equipment_bookings(project_id);

alter table public.equipment_bookings enable row level security;

drop policy if exists "owner full access on equipment_bookings" on public.equipment_bookings;
create policy "owner full access on equipment_bookings" on public.equipment_bookings
  for all using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));

grant select, insert, update, delete on public.equipment_bookings to authenticated;
