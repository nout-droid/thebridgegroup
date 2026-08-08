-- Allergieën bij catering, voor zowel crew- als gasten-catering: een apart veld naast de
-- generieke "Opmerkingen", zodat het voor de cateraar direct zichtbaar is i.p.v. verstopt in
-- vrije notities. Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.

alter table public.catering_orders add column if not exists allergies text not null default '';
alter table public.guest_catering_orders add column if not exists allergies text not null default '';

-- get_shared_production geeft 'allergies' mee voor beide catering-secties in het klantenportaal.
-- Zelfde 1-parameter signatuur als de bestaande functie, dus create or replace vervangt hem
-- gewoon — geen drop nodig.
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
          'allergies', co.allergies,
          'supplier_name', s.name
        ) order by co.order_date, co.sort_order
      )
      from public.catering_orders co
      join proj on true
      left join public.suppliers s on s.id = co.supplier_id
      where co.project_id = proj.id
    ), '[]'::json),
    'guest_catering', coalesce((
      select json_agg(
        json_build_object(
          'id', gco.id,
          'order_date', gco.order_date,
          'stage_name', st.name,
          'moment', gco.moment,
          'style', gco.style,
          'guest_count', gco.guest_count,
          'veggie_count', gco.veggie_count,
          'vegan_count', gco.vegan_count,
          'kids_count', gco.kids_count,
          'special_diet_count', gco.special_diet_count,
          'notes', gco.notes,
          'allergies', gco.allergies,
          'supplier_name', s.name
        ) order by gco.order_date, gco.sort_order
      )
      from public.guest_catering_orders gco
      join proj on true
      left join public.stages st on st.id = gco.stage_id
      left join public.suppliers s on s.id = gco.supplier_id
      where gco.project_id = proj.id
    ), '[]'::json),
    'guest_dietary', coalesce((
      select json_agg(
        json_build_object(
          'name', eg.name,
          'plus_one_name', eg.plus_one_name,
          'dietary_notes', eg.dietary_notes
        ) order by eg.sort_order
      )
      from public.event_guests eg
      join proj on true
      where eg.project_id = proj.id and eg.dietary_notes <> ''
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

-- add_catering_by_client uitgebreid met p_allergies (trailing default parameter, dus
-- create or replace vervangt de bestaande functie i.p.v. een nieuwe overload aan te maken).
create or replace function public.add_catering_by_client(
  p_token uuid,
  p_order_date date,
  p_party text default '',
  p_crew_lunch int default 0,
  p_crew_dinner int default 0,
  p_notes text default '',
  p_allergies text default ''
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

  insert into public.catering_orders (project_id, order_date, party, crew_lunch, crew_dinner, notes, allergies)
  values (v_project_id, p_order_date, coalesce(p_party, ''), coalesce(p_crew_lunch, 0), coalesce(p_crew_dinner, 0), coalesce(p_notes, ''), coalesce(p_allergies, ''))
  returning id into v_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'catering', 'Catering toegevoegd voor ' || p_order_date::text);

  return v_id;
end;
$$;

grant execute on function public.add_catering_by_client(uuid, date, text, int, int, text, text) to anon;
