-- Tenderbeheer: track aanbestedingen/tenders los van de CRM-pipeline (andere workflow: een
-- deadline om in te dienen en een besluitdatum, i.p.v. contactmomenten tot een koop-beslissing).
-- Zelfde patroon als sales_leads/sales_lead_activities.
create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  client_name text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  stage text not null default 'geidentificeerd'
    check (stage in ('geidentificeerd', 'go_no_go', 'ingediend', 'gewonnen', 'verloren')),
  estimated_value numeric not null default 0,
  submission_deadline date,
  decision_date date,
  notes text not null default '',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenders_user_id_idx on public.tenders(user_id);

alter table public.tenders enable row level security;

drop policy if exists "team members can view tenders" on public.tenders;
create policy "team members can view tenders" on public.tenders
  for select using (public.is_team_member(user_id));
drop policy if exists "team members can insert tenders" on public.tenders;
create policy "team members can insert tenders" on public.tenders
  for insert with check (public.is_team_member(user_id));
drop policy if exists "team members can update tenders" on public.tenders;
create policy "team members can update tenders" on public.tenders
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
drop policy if exists "team admins can delete tenders" on public.tenders;
create policy "team admins can delete tenders" on public.tenders
  for delete using (public.is_team_admin(user_id));

grant select, insert, update, delete on public.tenders to authenticated;

create table if not exists public.tender_activities (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  activity_type text not null default 'note' check (activity_type in ('call', 'email', 'meeting', 'note')),
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tender_activities_tender_id_idx on public.tender_activities(tender_id);

alter table public.tender_activities enable row level security;

drop policy if exists "team members can view tender_activities" on public.tender_activities;
create policy "team members can view tender_activities" on public.tender_activities
  for select using (
    exists (select 1 from public.tenders tn where tn.id = tender_id and public.is_team_member(tn.user_id))
  );
drop policy if exists "team members can insert tender_activities" on public.tender_activities;
create policy "team members can insert tender_activities" on public.tender_activities
  for insert with check (
    exists (select 1 from public.tenders tn where tn.id = tender_id and public.is_team_member(tn.user_id))
  );
drop policy if exists "team admins can delete tender_activities" on public.tender_activities;
create policy "team admins can delete tender_activities" on public.tender_activities
  for delete using (
    exists (select 1 from public.tenders tn where tn.id = tender_id and public.is_team_admin(tn.user_id))
  );

grant select, insert, delete on public.tender_activities to authenticated;
