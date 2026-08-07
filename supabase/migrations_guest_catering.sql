-- Catering voor gasten stond nog nergens los van de crew-catering (die alleen lunch/
-- diner/night snacks per crewafnemer kent). Gasten hebben structureel andere info nodig
-- (moment, stijl van serveren, meerdere dieetcategorieën) en die behoefte verschilt per
-- type event (festival -> foodtrucks/borrel, wedding/gala -> seated diner, corporate ->
-- coffee breaks). event_type op projects geeft alleen een zinnige default bij het
-- aanmaken van een nieuwe order; validatie van de toegestane waarden gebeurt in
-- TypeScript (zelfde patroon als rsvp_status), niet via een DB check-constraint, zodat
-- deze migratie idempotent blijft op een bestaande projects-tabel.

alter table public.projects add column if not exists event_type text not null default 'festival';

create table if not exists public.guest_catering_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  order_date date not null,
  moment text not null default 'diner',
  style text not null default 'buffet',
  guest_count int not null default 0,
  veggie_count int not null default 0,
  vegan_count int not null default 0,
  kids_count int not null default 0,
  special_diet_count int not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists guest_catering_orders_project_id_idx on public.guest_catering_orders(project_id);
create index if not exists guest_catering_orders_supplier_id_idx on public.guest_catering_orders(supplier_id);
create index if not exists guest_catering_orders_stage_id_idx on public.guest_catering_orders(stage_id);

alter table public.guest_catering_orders enable row level security;

drop policy if exists "owner full access on guest_catering_orders" on public.guest_catering_orders;
create policy "owner full access on guest_catering_orders" on public.guest_catering_orders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );
