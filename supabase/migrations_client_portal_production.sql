-- Client-portal uitbreiding: (1) productie-onderdelen read-only zichtbaar maken voor de klant
-- (catering, materieel, comms, stroom, draaiboek, artiestenriders, open vragen, vluchten/hotel,
-- rundown), en (2) een klant-invoerkanaal (client_requests) waarmee de klant eigen behoeftes kan
-- aanmelden, duidelijk gescheiden van de begroting. Voer dit één keer uit in de Supabase SQL Editor.
-- Rundown hergebruikt de bestaande get_shared_rundowns(p_token) RPC (zelfde share_token), daarvoor
-- is geen nieuwe RPC nodig.

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  description text not null default '',
  quantity int not null default 1,
  requested_date date,
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists client_requests_project_id_idx on public.client_requests(project_id);

alter table public.client_requests enable row level security;

drop policy if exists "owner full access on client_requests" on public.client_requests;
create policy "owner full access on client_requests" on public.client_requests
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- Klant dient een eigen behoefte in (catering/materieel/comms/stroom/hotel/vlucht/overig),
-- token-scoped net als de overige get/update_..._by_client RPC's.
create or replace function public.add_client_request(
  p_share_token uuid,
  p_category text,
  p_description text,
  p_quantity int default 1,
  p_requested_date date default null,
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
  select id into v_project_id from public.projects where share_token = p_share_token;
  if v_project_id is null then
    return null;
  end if;

  insert into public.client_requests (project_id, category, description, quantity, requested_date, notes)
  values (v_project_id, p_category, coalesce(p_description, ''), coalesce(p_quantity, 1), p_requested_date, coalesce(p_notes, ''))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_client_request(uuid, text, text, int, date, text) to anon;

-- Read-only productie-overzicht voor de klant: catering, materieel, comms, stroom, draaiboek,
-- artiestenriders, open vragen/notulen, en een vluchten/hotel-samenvatting van crew (bewust zonder
-- paspoortnummer/ticketnummer/id-nummer/toegangsdata — dat is interne/gevoelige data, geen klantinfo).
-- Ook de eigen ingediende client_requests (voor statusoverzicht).
create or replace function public.get_shared_production(p_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select id from public.projects where share_token = p_token
  )
  select json_build_object(
    'catering', coalesce((
      select json_agg(
        json_build_object(
          'id', co.id,
          'order_date', co.order_date,
          'party', co.party,
          'crew_lunch', co.crew_lunch,
          'veggie_lunch', co.veggie_lunch,
          'crew_dinner', co.crew_dinner,
          'veggie_dinner', co.veggie_dinner,
          'night_snacks', co.night_snacks,
          'notes', co.notes,
          'supplier_name', s.name
        ) order by co.order_date, co.sort_order
      )
      from public.catering_orders co
      join proj on true
      left join public.suppliers s on s.id = co.supplier_id
      where co.project_id = proj.id
    ), '[]'::json),
    'equipment', coalesce((
      select json_agg(
        json_build_object(
          'id', er.id,
          'machine_type', er.machine_type,
          'quantity', er.quantity,
          'accessories', er.accessories,
          'reservation_date', er.reservation_date,
          'duration', er.duration,
          'supplier_name', s.name
        ) order by er.reservation_date, er.sort_order
      )
      from public.equipment_reservations er
      join proj on true
      left join public.suppliers s on s.id = er.supplier_id
      where er.project_id = proj.id
    ), '[]'::json),
    'comms', coalesce((
      select json_agg(
        json_build_object(
          'id', ca.id,
          'kind', ca.kind,
          'user_name', ca.user_name,
          'device_type', ca.device_type,
          'channels', ca.channels,
          'supplier_name', s.name
        ) order by ca.sort_order
      )
      from public.comms_assignments ca
      join proj on true
      left join public.suppliers s on s.id = ca.supplier_id
      where ca.project_id = proj.id
    ), '[]'::json),
    'power', coalesce((
      select json_agg(
        json_build_object(
          'id', pr.id,
          'stage_name', st.name,
          'description', pr.description,
          'quantity', pr.quantity,
          'position', pr.position,
          'notes', pr.notes,
          'supplier_name', s.name
        ) order by pr.sort_order
      )
      from public.power_requests pr
      join proj on true
      left join public.stages st on st.id = pr.stage_id
      left join public.suppliers s on s.id = pr.supplier_id
      where pr.project_id = proj.id
    ), '[]'::json),
    'schedule', coalesce((
      select json_agg(
        json_build_object(
          'id', si.id,
          'stage_name', st.name,
          'activity_date', si.activity_date,
          'activity_time', si.activity_time,
          'activity', si.activity,
          'notes', si.notes,
          'suppliers', coalesce((
            select json_agg(s2.name order by sis.sort_order)
            from public.schedule_item_suppliers sis
            join public.suppliers s2 on s2.id = sis.supplier_id
            where sis.schedule_item_id = si.id
          ), '[]'::json)
        ) order by si.activity_date, si.activity_time, si.sort_order
      )
      from public.schedule_items si
      join proj on true
      left join public.stages st on st.id = si.stage_id
      where si.project_id = proj.id
    ), '[]'::json),
    'artist_riders', coalesce((
      select json_agg(
        json_build_object(
          'id', ar.id,
          'artist_name', ar.artist_name,
          'rider_received', ar.rider_received,
          'notes', ar.notes,
          'own_light_operator', ar.own_light_operator,
          'own_audio_operator', ar.own_audio_operator,
          'rider_link', ar.rider_link
        ) order by ar.sort_order
      )
      from public.artist_riders ar
      join proj on true
      where ar.project_id = proj.id
    ), '[]'::json),
    'open_questions', coalesce((
      select json_agg(
        json_build_object('id', oq.id, 'question', oq.question, 'answer', oq.answer, 'pending', oq.pending)
        order by oq.sort_order
      )
      from public.open_questions oq
      join proj on true
      where oq.project_id = proj.id
    ), '[]'::json),
    'meeting_notes', coalesce((
      select json_agg(
        json_build_object('id', mn.id, 'note', mn.note, 'created_at', mn.created_at)
        order by mn.created_at desc
      )
      from public.meeting_notes mn
      join proj on true
      where mn.project_id = proj.id
    ), '[]'::json),
    'flights', coalesce((
      select json_agg(
        json_build_object(
          'id', cm.id,
          'name', cm.name,
          'role', cm.role,
          'flight_departure_airport', cm.flight_departure_airport,
          'flight_destination', cm.flight_destination,
          'flight_departure_at', cm.flight_departure_at,
          'flight_return_at', cm.flight_return_at
        ) order by cm.sort_order
      )
      from public.crew_members cm
      join proj on true
      where cm.project_id = proj.id and cm.needs_flight = true
    ), '[]'::json),
    'hotel', coalesce((
      select json_agg(
        json_build_object('id', cm.id, 'name', cm.name, 'role', cm.role)
        order by cm.sort_order
      )
      from public.crew_members cm
      join proj on true
      where cm.project_id = proj.id and cm.needs_hotel = true
    ), '[]'::json),
    'client_requests', coalesce((
      select json_agg(
        json_build_object(
          'id', cr.id,
          'category', cr.category,
          'description', cr.description,
          'quantity', cr.quantity,
          'requested_date', cr.requested_date,
          'notes', cr.notes,
          'status', cr.status,
          'created_at', cr.created_at
        ) order by cr.created_at desc
      )
      from public.client_requests cr
      join proj on true
      where cr.project_id = proj.id
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_production(uuid) to anon;
