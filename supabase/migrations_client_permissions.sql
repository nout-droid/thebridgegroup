-- Klantrechten per onderdeel: de producer bepaalt per sectie van het klantenportaal of de klant
-- niets ziet ("none"), alleen mag meekijken ("view"), of mag meebewerken ("edit" — echte
-- samenwerking op dat onderdeel). Eén jsonb-kolom op projects i.p.v. losse booleans per sectie,
-- zodat nieuwe secties later zonder schemawijziging toegevoegd kunnen worden. Geldt voor beide
-- klant-loginvormen (het lichte Event ID/wachtwoord-project en het gekoppelde client_account),
-- want dit is een keuze van de producer per project, niet per inlogmethode.
-- Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.

alter table public.projects add column if not exists client_permissions jsonb not null default '{
  "catering": "view",
  "guest_catering": "view",
  "equipment": "view",
  "comms": "view",
  "power": "view",
  "schedule": "view",
  "artist_riders": "view",
  "questions": "view",
  "travel": "view",
  "speakers": "view",
  "guests": "view",
  "contingency": "view"
}'::jsonb;

-- Fix voor een gat in de bestaande budget-zichtbaarheid: get_shared_project deed tot nu toe
-- budget_closed = false (dus altijd de VOLLEDIGE begroting incl. inkoopprijs/marge/leverancier)
-- zodra er geen klantaccount is — d.w.z. voor élk project dat nog via het lichte Event
-- ID/wachtwoord-mechanisme werkt, ongeacht wat de producer zou willen. Er was voor die
-- inlogvorm geen toggle om dit dicht te zetten (alleen client_accounts.budget_access, en die
-- geldt alleen voor het gekoppelde klantaccount-mechanisme). Deze kolom voegt diezelfde
-- open/closed-keuze toe op projectniveau. Default 'open' = geen gedragswijziging voor
-- bestaande projecten; de producer kan 'm per project alsnog dichtzetten.
alter table public.projects add column if not exists budget_access text not null default 'open'
  check (budget_access in ('closed', 'open'));

-- get_shared_project geeft client_permissions mee zodat share-view.tsx per sectie kan bepalen
-- of hij verborgen/read-only/bewerkbaar getoond moet worden, én gebruikt nu projects.budget_access
-- i.p.v. een hardcoded "false" voor de Event ID/wachtwoord-inlogvorm. Overload-val: dit is
-- dezelfde 2-parameter signatuur als de bestaande functie (migrations_client_accounts.sql), dus
-- create or replace vervangt hem gewoon — geen drop nodig.
create or replace function public.get_shared_project(p_token uuid, p_client_account_id uuid default null)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select * from public.projects where share_token = p_token
  ),
  access as (
    select case
      when p_client_account_id is null then (select budget_access = 'closed' from proj)
      else coalesce(
        (
          select ca.budget_access = 'closed'
          from public.client_accounts ca
          join public.client_account_projects cap on cap.client_account_id = ca.id
          where ca.id = p_client_account_id
            and cap.project_id = (select id from proj)
        ),
        true
      )
    end as budget_closed
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
        'margin_type', case when a.budget_closed then null else cd.margin_type end,
        'margin_value', case when a.budget_closed then null else cd.margin_value end,
        'cost_price', case when a.budget_closed then null else cd.cost_price end,
        'supplier_name', case when a.budget_closed then null else cd.supplier_name end,
        'client_price', cd.client_price,
        'line_items', case when a.budget_closed then '[]'::json else cd.line_items end
      ) as data,
      cd.sort_order
    from cat_data cd, access a
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
      ),
      'budget_access', case when (select budget_closed from access) then 'closed' else 'open' end,
      'client_permissions', p.client_permissions,
      'signature_url', p.signature_url,
      'signature_signed_by', p.signature_signed_by,
      'signature_signed_at', p.signature_signed_at,
      'is_outdoor', p.is_outdoor,
      'contingency_plan', p.contingency_plan
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

grant execute on function public.get_shared_project(uuid, uuid) to anon;

-- get_shared_guests: samenvatting van de gastenlijst + tafelindeling voor de klant, zodra
-- client_permissions.guests dat toestaat (afgedwongen client-side in share-view.tsx, dit is
-- puur de data-laag). Bewust GEEN email/telefoon/interne notities/badge_token — dat is contact-
-- en operationele info die de klant niet per-gast hoeft te zien, alleen de RSVP-status en
-- indeling die voor hen relevant is.
create or replace function public.get_shared_guests(p_token uuid)
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
    'guests', coalesce((
      select json_agg(
        json_build_object(
          'id', eg.id,
          'name', eg.name,
          'guest_type', eg.guest_type,
          'rsvp_status', eg.rsvp_status,
          'plus_ones', eg.plus_ones,
          'plus_one_name', eg.plus_one_name,
          'dietary_notes', eg.dietary_notes,
          'table_name', st.name
        ) order by eg.sort_order
      )
      from public.event_guests eg
      left join public.seating_tables st on st.id = eg.table_id
      where eg.project_id = proj.id
    ), '[]'::json),
    'tables', coalesce((
      select json_agg(
        json_build_object('id', t.id, 'name', t.name, 'capacity', t.capacity)
        order by t.sort_order
      )
      from public.seating_tables t
      where t.project_id = proj.id
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_guests(uuid) to anon;
