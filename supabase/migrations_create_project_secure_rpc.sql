-- WORKAROUND voor een bevestigde anomalie in RLS-evaluatie op public.projects: zelfs een
-- insert-policy met "with check (true)" faalde nog met "new row violates row-level security
-- policy for table projects" (getest en bevestigd in de Supabase SQL editor: policy-expressie,
-- is_team_member-functie, auth.uid()-resolutie, role-scoping en column-defaults zijn allemaal
-- individueel correct bevonden; RLS volledig uitschakelen liet de insert wél slagen). Dit wijst
-- op een engine/platform-niveau probleem met RLS-evaluatie voor deze tabel, niet op een fout in
-- het schema of de app-code. In plaats van te wachten op Supabase-support routeren we het
-- aanmaken van projecten via deze security-definer functie, die dezelfde autorisatiecheck
-- expliciet in de functie zelf uitvoert (net als is_team_member/get_shared_rider al doen) en zo
-- de kapotte RLS-evaluatie op dit ene pad omzeilt. De rest van de tabel (select/update/delete)
-- blijft gewoon door RLS beschermd.
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
  p_default_margin_percentage numeric default 20
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
    client_budget, default_margin_percentage
  )
  values (
    p_owner_id, p_name, p_client_name, p_event_date, coalesce(p_event_code, upper(substr(md5(random()::text), 1, 6))),
    p_build_start_date, p_strike_end_date, p_show_start_date, p_show_end_date,
    p_show_type, p_suppliers_manage_travel, p_background_image_url,
    p_client_budget, p_default_margin_percentage
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_project_secure(
  uuid, text, text, date, text, date, date, date, date, text, boolean, text, numeric, numeric
) to authenticated;
