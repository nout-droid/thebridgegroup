-- Losstaande, project-overstijgende crew-database: één record per persoon met
-- standaardtarieven (dag/overuren/KM) en woonadres, plus periodes waarin diegene wel/niet
-- beschikbaar is. Koppelt via crew_members.freelancer_id aan specifieke project-toewijzingen
-- (zelfde patroon als suppliers <-> crew_members.supplier_id), zodat tarieven automatisch
-- meekomen bij toewijzing maar per project nog aan te passen blijven.
create table if not exists public.freelancers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null default '',
  email text not null default '',
  phone text not null default '',
  home_address text not null default '',
  day_rate numeric not null default 0,
  overtime_rate numeric not null default 0,
  km_rate numeric not null default 0.23,
  skills text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists freelancers_user_id_idx on public.freelancers(user_id);

alter table public.freelancers enable row level security;

drop policy if exists "team members can view freelancers" on public.freelancers;
create policy "team members can view freelancers" on public.freelancers
  for select using (public.is_team_member(user_id));
drop policy if exists "team members can insert freelancers" on public.freelancers;
create policy "team members can insert freelancers" on public.freelancers
  for insert with check (public.is_team_member(user_id));
drop policy if exists "team members can update freelancers" on public.freelancers;
create policy "team members can update freelancers" on public.freelancers
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
drop policy if exists "team admins can delete freelancers" on public.freelancers;
create policy "team admins can delete freelancers" on public.freelancers
  for delete using (public.is_team_admin(user_id));

grant select, insert, update, delete on public.freelancers to authenticated;

create table if not exists public.freelancer_availability (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.freelancers(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'unavailable' check (status in ('available', 'unavailable')),
  note text not null default '',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists freelancer_availability_freelancer_id_idx
  on public.freelancer_availability(freelancer_id);

alter table public.freelancer_availability enable row level security;

drop policy if exists "team members can view freelancer_availability" on public.freelancer_availability;
create policy "team members can view freelancer_availability" on public.freelancer_availability
  for select using (
    exists (select 1 from public.freelancers f where f.id = freelancer_id and public.is_team_member(f.user_id))
  );
drop policy if exists "team members can insert freelancer_availability" on public.freelancer_availability;
create policy "team members can insert freelancer_availability" on public.freelancer_availability
  for insert with check (
    exists (select 1 from public.freelancers f where f.id = freelancer_id and public.is_team_member(f.user_id))
  );
drop policy if exists "team admins can delete freelancer_availability" on public.freelancer_availability;
create policy "team admins can delete freelancer_availability" on public.freelancer_availability
  for delete using (
    exists (select 1 from public.freelancers f where f.id = freelancer_id and public.is_team_admin(f.user_id))
  );

grant select, insert, delete on public.freelancer_availability to authenticated;

alter table public.crew_members add column if not exists freelancer_id uuid references public.freelancers(id) on delete set null;
create index if not exists crew_members_freelancer_id_idx on public.crew_members(freelancer_id);
