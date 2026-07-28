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

-- Nacht-batch: (1) gasten-/accreditatie check-in (concurrent-gap t.o.v. Cvent OnArrival:
-- gastenlijst + RSVP + real-time inchecken op de badge-QR, i.p.v. alleen een statische
-- toegangsstatus), en (2) een additieve 'organizations'-laag als fundament om de tool op
-- termijn als abonnement aan andere AV-bedrijven te kunnen aanbieden (zie rapport in de chat
-- voor de volledige toelichting/risico-afweging). Voer dit één keer uit in de Supabase SQL
-- Editor, ná de eerdere migraties.

-- ========== 1. CHECK-IN ==========

alter table public.crew_members add column if not exists checked_in_at timestamptz;

create table if not exists public.event_guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  guest_type text not null default 'gast',
  rsvp_status text not null default 'uitgenodigd',
  plus_ones int not null default 0,
  notes text not null default '',
  badge_token uuid not null default gen_random_uuid() unique,
  checked_in_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_guests_project_id_idx on public.event_guests(project_id);

alter table public.event_guests enable row level security;

drop policy if exists "owner full access on event_guests" on public.event_guests;
create policy "owner full access on event_guests" on public.event_guests
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- Geen anon-policy nodig: de gasten-badgepagina (/guest-badge/[token]) gebruikt, net als de
-- bestaande crew-badgepagina, de service-role admin-client om badge_token op te zoeken —
-- dezelfde bearer-token-via-QR-aanpak die al voor crew_members bestaat.

-- ========== 2. ORGANIZATIONS (additief fundament voor abonnement/SaaS) ==========
-- Puur additief: bestaande RLS-policies (has_project_access, is_team_member, etc.) blijven
-- ongewijzigd en werken al per owner_user_id/project.user_id. Deze tabel voegt alleen een
-- naam, plan en Stripe-koppeling toe per eigenaar-account — niets aan de bestaande
-- toegangslogica verandert.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'The Bridge AV Group',
  logo_url text,
  plan text not null default 'trial',
  subscription_status text not null default 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists organizations_owner_user_id_idx on public.organizations(owner_user_id);

alter table public.organizations enable row level security;

drop policy if exists "team can view organization" on public.organizations;
create policy "team can view organization" on public.organizations
  for select using (public.is_team_member(owner_user_id));

drop policy if exists "owner can update organization" on public.organizations;
create policy "owner can update organization" on public.organizations
  for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "owner can insert organization" on public.organizations;
create policy "owner can insert organization" on public.organizations
  for insert with check (auth.uid() = owner_user_id);

-- Backfill: elke bestaande projecteigenaar krijgt een organizations-rij zodat de huidige
-- (enige) klant meteen een werkende organisatienaam/plan heeft, zonder dat er iets verandert
-- aan wat ze nu al zien.
insert into public.organizations (owner_user_id, name, plan, subscription_status, trial_ends_at)
select distinct p.user_id, 'The Bridge AV Group', 'pro', 'active', null::timestamptz
from public.projects p
where not exists (
  select 1 from public.organizations o where o.owner_user_id = p.user_id
);

-- Nieuwe self-service signups (zie /signup) krijgen automatisch hun eigen organizations-rij
-- via de signup-server-action (niet via een trigger, zodat de naam die de gebruiker invult
-- meteen wordt opgeslagen).

-- Voegt organization_name toe aan get_shared_project, zodat het klantportaal (share-view.tsx)
-- de eigen bedrijfsnaam van de organisatie toont i.p.v. altijd "The Bridge AV Group" — nodig
-- om de tool als white-label abonnement aan andere AV-bedrijven te kunnen aanbieden. Voer dit
-- één keer uit in de Supabase SQL Editor, ná de eerdere migraties (incl.
-- migrations_checkin_and_organizations.sql, die de organizations-tabel aanmaakt).

create or replace function public.get_shared_project(p_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select * from public.projects where share_token = p_token
  ),
  cat_data as (
    select
      c.id,
      c.stage_id,
      c.name,
      c.sort_order,
      c.status,
      c.margin_type,
      c.margin_value,
      coalesce(chosen.cost_price, c.manual_cost) as cost_price,
      chosen.supplier_name,
      case
        when coalesce(chosen.cost_price, c.manual_cost) is null then null
        when c.margin_type = 'percentage' then round(coalesce(chosen.cost_price, c.manual_cost) * (1 + c.margin_value / 100), 2)
        else coalesce(chosen.cost_price, c.manual_cost) + c.margin_value
      end as client_price,
      coalesce(chosen.line_items, '[]'::json) as line_items
    from public.categories c
    join proj p on p.id = c.project_id
    left join lateral (
      select
        q.cost_price,
        s.name as supplier_name,
        (
          select json_agg(
            json_build_object(
              'description', qli.description,
              'quantity', qli.quantity,
              'unit_price', qli.unit_price
            ) order by qli.created_at
          )
          from public.quote_line_items qli
          where qli.quote_id = q.id
        ) as line_items
      from public.quotes q
      join public.suppliers s on s.id = q.supplier_id
      where q.category_id = c.id and q.status = 'gekozen'
      limit 1
    ) chosen on true
  ),
  cat_json as (
    select
      cd.stage_id,
      json_build_object(
        'id', cd.id,
        'name', cd.name,
        'sort_order', cd.sort_order,
        'status', cd.status,
        'margin_type', cd.margin_type,
        'margin_value', cd.margin_value,
        'cost_price', cd.cost_price,
        'supplier_name', cd.supplier_name,
        'client_price', cd.client_price,
        'line_items', cd.line_items
      ) as data,
      cd.sort_order
    from cat_data cd
  )
  select json_build_object(
    'project', json_build_object(
      'name', p.name,
      'client_name', p.client_name,
      'event_date', p.event_date,
      'status', p.status,
      'background_image_url', p.background_image_url,
      'budget_approval_status', p.budget_approval_status,
      'budget_approval_comment', p.budget_approval_comment,
      'organization_name', coalesce(
        (select o.name from public.organizations o where o.owner_user_id = p.user_id),
        'The Bridge AV Group'
      )
    ),
    'project_wide_categories', coalesce((
      select json_agg(cj.data order by cj.sort_order)
      from cat_json cj
      where cj.stage_id is null
    ), '[]'::json),
    'stages', coalesce((
      select json_agg(
        json_build_object(
          'id', s.id,
          'name', s.name,
          'categories', coalesce((
            select json_agg(cj.data order by cj.sort_order)
            from cat_json cj
            where cj.stage_id = s.id
          ), '[]'::json)
        ) order by s.sort_order
      )
      from public.stages s
      where s.project_id = p.id
    ), '[]'::json),
    'media', coalesce((
      select json_agg(
        json_build_object('kind', pm.kind, 'url', pm.url, 'caption', pm.caption)
        order by pm.sort_order
      )
      from public.project_media pm
      where pm.project_id = p.id
    ), '[]'::json)
  )
  from proj p;
$$;

grant execute on function public.get_shared_project(uuid) to anon;
