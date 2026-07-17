-- Productieplanning: crew & accreditatie, materieel, comms/portofoons, catering,
-- artiestenriders, open vragen en notulen. Allemaal projectbreed (geen stage-koppeling).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  role text not null default '',
  access_level text not null default '',
  id_number text not null default '',
  accredited boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists crew_members_project_id_idx on public.crew_members(project_id);

alter table public.crew_members enable row level security;

drop policy if exists "owner full access on crew_members" on public.crew_members;
create policy "owner full access on crew_members" on public.crew_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.equipment_reservations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  machine_type text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  quantity int not null default 1,
  accessories text not null default '',
  reservation_date date,
  duration text not null default '',
  machine_number text not null default '',
  picked_up boolean not null default false,
  key_holder text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists equipment_reservations_project_id_idx on public.equipment_reservations(project_id);

alter table public.equipment_reservations enable row level security;

drop policy if exists "owner full access on equipment_reservations" on public.equipment_reservations;
create policy "owner full access on equipment_reservations" on public.equipment_reservations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.comms_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'intercom',
  user_name text not null default '',
  device_type text not null default '',
  channels text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists comms_assignments_project_id_idx on public.comms_assignments(project_id);

alter table public.comms_assignments enable row level security;

drop policy if exists "owner full access on comms_assignments" on public.comms_assignments;
create policy "owner full access on comms_assignments" on public.comms_assignments
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.catering_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  order_date date not null,
  party text not null default '',
  crew_lunch int not null default 0,
  veggie_lunch int not null default 0,
  crew_dinner int not null default 0,
  veggie_dinner int not null default 0,
  night_snacks int not null default 0,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists catering_orders_project_id_idx on public.catering_orders(project_id);

alter table public.catering_orders enable row level security;

drop policy if exists "owner full access on catering_orders" on public.catering_orders;
create policy "owner full access on catering_orders" on public.catering_orders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.artist_riders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  artist_name text not null default '',
  rider_received boolean not null default false,
  notes text not null default '',
  own_light_operator boolean not null default false,
  own_audio_operator boolean not null default false,
  rider_link text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists artist_riders_project_id_idx on public.artist_riders(project_id);

alter table public.artist_riders enable row level security;

drop policy if exists "owner full access on artist_riders" on public.artist_riders;
create policy "owner full access on artist_riders" on public.artist_riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.open_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question text not null default '',
  answer text not null default '',
  pending boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists open_questions_project_id_idx on public.open_questions(project_id);

alter table public.open_questions enable row level security;

drop policy if exists "owner full access on open_questions" on public.open_questions;
create policy "owner full access on open_questions" on public.open_questions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meeting_notes_project_id_idx on public.meeting_notes(project_id);

alter table public.meeting_notes enable row level security;

drop policy if exists "owner full access on meeting_notes" on public.meeting_notes;
create policy "owner full access on meeting_notes" on public.meeting_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
