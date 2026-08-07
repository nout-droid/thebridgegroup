-- Backlog batch 4: pre-production duration, CRM personal-contact fields, acquisition tracking.

-- Part 1: pre-production duration + create_project_secure RPC extension
alter table public.projects add column if not exists pre_production_weeks int;

create or replace function public.create_project_secure(
  p_owner_id uuid,
  p_name text,
  p_client_name text default '',
  p_event_date date default null,
  p_event_code text default null,
  p_build_start_date date default null,
  p_strike_end_date date default null,
  p_show_start_date date default null,
  p_show_end_date date default null,
  p_show_type text default 'dag',
  p_suppliers_manage_travel boolean default false,
  p_background_image_url text default null,
  p_client_budget numeric default null,
  p_default_margin_percentage numeric default 20,
  p_event_type text default 'festival',
  p_pre_production_weeks int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_team_member(p_owner_id) then
    raise exception 'Niet toegestaan: geen toegang tot dit team' using errcode = '42501';
  end if;

  insert into public.projects (
    user_id, name, client_name, event_date, event_code,
    build_start_date, strike_end_date, show_start_date, show_end_date,
    show_type, suppliers_manage_travel, background_image_url,
    client_budget, default_margin_percentage, event_type, pre_production_weeks
  )
  values (
    p_owner_id, p_name, p_client_name, p_event_date, coalesce(p_event_code, upper(substr(md5(random()::text), 1, 6))),
    p_build_start_date, p_strike_end_date, p_show_start_date, p_show_end_date,
    p_show_type, p_suppliers_manage_travel, p_background_image_url,
    p_client_budget, p_default_margin_percentage, p_event_type, p_pre_production_weeks
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_project_secure(
  uuid, text, text, date, text, date, date, date, date, text, boolean, text, numeric, numeric, text, int
) to authenticated;

-- Part 3: CRM personal-contact fields — verjaardag/gezin/voorkeuren van de contactpersoon,
-- zodat persoonlijke aandacht (kaartje, lievelingseten bij een afspraak) niet verloren gaat.
alter table public.sales_leads add column if not exists contact_birthday date;
alter table public.sales_leads add column if not exists contact_family_notes text not null default '';
alter table public.sales_leads add column if not exists contact_preferences text not null default '';

-- Part 4: acquisition activity type ("cold call") + optioneel maandtarget.
alter table public.sales_lead_activities drop constraint if exists sales_lead_activities_activity_type_check;
alter table public.sales_lead_activities add constraint sales_lead_activities_activity_type_check
  check (activity_type in ('call', 'cold_call', 'email', 'meeting', 'note'));

create table if not exists public.sales_acquisition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_per_month int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.sales_acquisition_targets enable row level security;
drop policy if exists "team access on sales_acquisition_targets" on public.sales_acquisition_targets;
create policy "team access on sales_acquisition_targets" on public.sales_acquisition_targets
  for all using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
grant select, insert, update, delete on public.sales_acquisition_targets to authenticated;
