-- Sales-CRM: bedrijven/leads door de pipeline tot gewonnen/verloren, met geschatte
-- dealwaarde + win-kans voor een omzet-forecast, en een interactie-log per lead.
-- Bij "Gewonnen" koppel je de lead aan een (bestaand of nieuw) project via project_id.
create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  website text not null default '',
  source text not null default '',
  stage text not null default 'lead'
    check (stage in ('lead', 'contacted', 'proposal', 'quote_sent', 'won', 'lost')),
  estimated_value numeric not null default 0,
  probability_percentage numeric not null default 10 check (probability_percentage between 0 and 100),
  expected_close_date date,
  notes text not null default '',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_leads_user_id_idx on public.sales_leads(user_id);

alter table public.sales_leads enable row level security;

drop policy if exists "team members can view sales_leads" on public.sales_leads;
create policy "team members can view sales_leads" on public.sales_leads
  for select using (public.is_team_member(user_id));
drop policy if exists "team members can insert sales_leads" on public.sales_leads;
create policy "team members can insert sales_leads" on public.sales_leads
  for insert with check (public.is_team_member(user_id));
drop policy if exists "team members can update sales_leads" on public.sales_leads;
create policy "team members can update sales_leads" on public.sales_leads
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
drop policy if exists "team admins can delete sales_leads" on public.sales_leads;
create policy "team admins can delete sales_leads" on public.sales_leads
  for delete using (public.is_team_admin(user_id));

grant select, insert, update, delete on public.sales_leads to authenticated;

create table if not exists public.sales_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  activity_type text not null default 'note' check (activity_type in ('call', 'email', 'meeting', 'note')),
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sales_lead_activities_lead_id_idx on public.sales_lead_activities(lead_id);

alter table public.sales_lead_activities enable row level security;

drop policy if exists "team members can view sales_lead_activities" on public.sales_lead_activities;
create policy "team members can view sales_lead_activities" on public.sales_lead_activities
  for select using (
    exists (select 1 from public.sales_leads l where l.id = lead_id and public.is_team_member(l.user_id))
  );
drop policy if exists "team members can insert sales_lead_activities" on public.sales_lead_activities;
create policy "team members can insert sales_lead_activities" on public.sales_lead_activities
  for insert with check (
    exists (select 1 from public.sales_leads l where l.id = lead_id and public.is_team_member(l.user_id))
  );
drop policy if exists "team admins can delete sales_lead_activities" on public.sales_lead_activities;
create policy "team admins can delete sales_lead_activities" on public.sales_lead_activities
  for delete using (
    exists (select 1 from public.sales_leads l where l.id = lead_id and public.is_team_admin(l.user_id))
  );

grant select, insert, delete on public.sales_lead_activities to authenticated;
