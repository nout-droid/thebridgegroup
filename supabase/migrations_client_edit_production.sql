-- Klant-bewerkbare productie-onderdelen: zodra de producer een sectie op "edit" zet via
-- client_permissions (zie migrations_client_permissions.sql), mag de klant zelf regels
-- toevoegen/verwijderen in die sectie — echte samenwerking op materieel, comms, stroom,
-- draaiboek, catering, artiestenriders en open vragen. Zelfde RPC-patroon als het bestaande
-- add_client_request/upsert_intake_checklist_answer_by_client: geen "use server"-actions nodig
-- (geen file-uploads hier), de permissiecheck zit in de functie zelf, aangeroepen met de
-- anon-key rechtstreeks vanuit share-view.tsx. Voer dit één keer uit in de Supabase SQL Editor,
-- ná migrations_client_permissions.sql.

create or replace function public.client_can_edit_section(p_project_id uuid, p_section text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select client_permissions ->> p_section from public.projects where id = p_project_id) = 'edit',
    false
  );
$$;

-- === Materieel (equipment_reservations) ===

create or replace function public.add_equipment_by_client(
  p_token uuid,
  p_machine_type text,
  p_quantity int default 1,
  p_accessories text default '',
  p_reservation_date date default null,
  p_duration text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'equipment') or coalesce(trim(p_machine_type), '') = '' then
    return null;
  end if;

  insert into public.equipment_reservations (project_id, machine_type, quantity, accessories, reservation_date, duration)
  values (v_project_id, p_machine_type, coalesce(p_quantity, 1), coalesce(p_accessories, ''), p_reservation_date, coalesce(p_duration, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'materieel', 'Materieel toegevoegd: ' || p_machine_type);

  return v_id;
end;
$$;

grant execute on function public.add_equipment_by_client(uuid, text, int, text, date, text) to anon;

create or replace function public.delete_equipment_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'equipment') then
    return false;
  end if;

  delete from public.equipment_reservations where id = p_id and project_id = v_project_id;
  return found;
end;
$$;

grant execute on function public.delete_equipment_by_client(uuid, uuid) to anon;

-- === Comms & portofoons (comms_assignments) ===

create or replace function public.add_comms_by_client(
  p_token uuid,
  p_user_name text,
  p_device_type text default '',
  p_channels text default '',
  p_kind text default 'intercom'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'comms') or coalesce(trim(p_user_name), '') = '' then
    return null;
  end if;

  insert into public.comms_assignments (project_id, kind, user_name, device_type, channels)
  values (v_project_id, coalesce(p_kind, 'intercom'), p_user_name, coalesce(p_device_type, ''), coalesce(p_channels, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'comms', 'Comms toegevoegd: ' || p_user_name);

  return v_id;
end;
$$;

grant execute on function public.add_comms_by_client(uuid, text, text, text, text) to anon;

create or replace function public.delete_comms_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'comms') then
    return false;
  end if;

  delete from public.comms_assignments where id = p_id and project_id = v_project_id;
  return found;
end;
$$;

grant execute on function public.delete_comms_by_client(uuid, uuid) to anon;

-- === Stroom (power_requests) ===

create or replace function public.add_power_by_client(
  p_token uuid,
  p_description text,
  p_quantity int default 1,
  p_position text default '',
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'power') or coalesce(trim(p_description), '') = '' then
    return null;
  end if;

  insert into public.power_requests (project_id, description, quantity, position, notes)
  values (v_project_id, p_description, coalesce(p_quantity, 1), coalesce(p_position, ''), coalesce(p_notes, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'stroom', 'Stroomaanvraag toegevoegd: ' || p_description);

  return v_id;
end;
$$;

grant execute on function public.add_power_by_client(uuid, text, int, text, text) to anon;

create or replace function public.delete_power_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'power') then
    return false;
  end if;

  delete from public.power_requests where id = p_id and project_id = v_project_id;
  return found;
end;
$$;

grant execute on function public.delete_power_by_client(uuid, uuid) to anon;

-- === Draaiboek (schedule_items) ===

create or replace function public.add_schedule_item_by_client(
  p_token uuid,
  p_activity_date date,
  p_activity_time time,
  p_activity text,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'schedule')
     or p_activity_date is null or p_activity_time is null or coalesce(trim(p_activity), '') = '' then
    return null;
  end if;

  insert into public.schedule_items (project_id, activity_date, activity_time, activity, notes)
  values (v_project_id, p_activity_date, p_activity_time, p_activity, coalesce(p_notes, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'draaiboek', 'Draaiboek-item toegevoegd: ' || p_activity);

  return v_id;
end;
$$;

grant execute on function public.add_schedule_item_by_client(uuid, date, time, text, text) to anon;

create or replace function public.delete_schedule_item_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'schedule') then
    return false;
  end if;

  delete from public.schedule_items where id = p_id and project_id = v_project_id;
  return found;
end;
$$;

grant execute on function public.delete_schedule_item_by_client(uuid, uuid) to anon;

-- === Catering (catering_orders) ===

create or replace function public.add_catering_by_client(
  p_token uuid,
  p_order_date date,
  p_party text default '',
  p_crew_lunch int default 0,
  p_crew_dinner int default 0,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'catering') or p_order_date is null then
    return null;
  end if;

  insert into public.catering_orders (project_id, order_date, party, crew_lunch, crew_dinner, notes)
  values (v_project_id, p_order_date, coalesce(p_party, ''), coalesce(p_crew_lunch, 0), coalesce(p_crew_dinner, 0), coalesce(p_notes, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'catering', 'Catering toegevoegd voor ' || p_order_date::text);

  return v_id;
end;
$$;

grant execute on function public.add_catering_by_client(uuid, date, text, int, int, text) to anon;

create or replace function public.delete_catering_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'catering') then
    return false;
  end if;

  delete from public.catering_orders where id = p_id and project_id = v_project_id;
  return found;
end;
$$;

grant execute on function public.delete_catering_by_client(uuid, uuid) to anon;

-- === Artiestenriders (artist_riders) ===

create or replace function public.add_artist_rider_by_client(
  p_token uuid,
  p_artist_name text,
  p_notes text default '',
  p_rider_link text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'artist_riders') or coalesce(trim(p_artist_name), '') = '' then
    return null;
  end if;

  insert into public.artist_riders (project_id, artist_name, notes, rider_link)
  values (v_project_id, p_artist_name, coalesce(p_notes, ''), coalesce(p_rider_link, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'artiesten', 'Artiest toegevoegd: ' || p_artist_name);

  return v_id;
end;
$$;

grant execute on function public.add_artist_rider_by_client(uuid, text, text, text) to anon;

create or replace function public.delete_artist_rider_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'artist_riders') then
    return false;
  end if;

  delete from public.artist_riders where id = p_id and project_id = v_project_id;
  return found;
end;
$$;

grant execute on function public.delete_artist_rider_by_client(uuid, uuid) to anon;

-- === Open vragen (open_questions) ===

create or replace function public.add_open_question_by_client(p_token uuid, p_question text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'questions') or coalesce(trim(p_question), '') = '' then
    return null;
  end if;

  insert into public.open_questions (project_id, question)
  values (v_project_id, p_question)
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'vragen', 'Vraag gesteld: ' || p_question);

  return v_id;
end;
$$;

grant execute on function public.add_open_question_by_client(uuid, text) to anon;

create or replace function public.delete_open_question_by_client(p_token uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;
  -- Alleen de eigen (nog niet beantwoorde) vraag verwijderen, niet producer-content overschrijven.
  if v_project_id is null or not public.client_can_edit_section(v_project_id, 'questions') then
    return false;
  end if;

  delete from public.open_questions where id = p_id and project_id = v_project_id and pending = true;
  return found;
end;
$$;

grant execute on function public.delete_open_question_by_client(uuid, uuid) to anon;
