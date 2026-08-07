-- E-signing: klant zet een digitale handtekening in het klantportaal, die automatisch op de
-- offerte/factuur-PDF verschijnt zodra die daarna (opnieuw) wordt gedownload.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.projects add column if not exists signature_url text;
alter table public.projects add column if not exists signature_signed_by text;
alter table public.projects add column if not exists signature_signed_at timestamptz;

-- get_shared_project uitgebreid met de 3 handtekening-velden (zelfde functie-body als
-- full_schema.sql, alleen de project-json_build_object krijgt er drie keys bij).
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
      when p_client_account_id is null then false
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
      c.id, c.stage_id, c.name, c.sort_order, c.status, c.margin_type, c.margin_value,
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
      select q.cost_price, s.name as supplier_name,
        (select json_agg(json_build_object('description', qli.description, 'quantity', qli.quantity, 'unit_price', qli.unit_price) order by qli.created_at)
         from public.quote_line_items qli where qli.quote_id = q.id) as line_items
      from public.quotes q
      join public.suppliers s on s.id = q.supplier_id
      where q.category_id = c.id and q.status = 'gekozen'
      limit 1
    ) chosen on true
  ),
  cat_json as (
    select cd.stage_id,
      json_build_object(
        'id', cd.id, 'name', cd.name, 'sort_order', cd.sort_order, 'status', cd.status,
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
      'name', p.name, 'client_name', p.client_name, 'event_date', p.event_date, 'status', p.status,
      'background_image_url', p.background_image_url,
      'budget_approval_status', p.budget_approval_status,
      'budget_approval_comment', p.budget_approval_comment,
      'organization_name', coalesce((select o.name from public.organizations o where o.owner_user_id = p.user_id), 'The Bridge AV Group'),
      'budget_access', case when (select budget_closed from access) then 'closed' else 'open' end,
      'signature_url', p.signature_url,
      'signature_signed_by', p.signature_signed_by,
      'signature_signed_at', p.signature_signed_at
    ),
    'project_wide_categories', coalesce((select json_agg(cj.data order by cj.sort_order) from cat_json cj where cj.stage_id is null), '[]'::json),
    'stages', coalesce((
      select json_agg(json_build_object('id', s.id, 'name', s.name,
        'categories', coalesce((select json_agg(cj.data order by cj.sort_order) from cat_json cj where cj.stage_id = s.id), '[]'::json)
      ) order by s.sort_order)
      from public.stages s where s.project_id = p.id
    ), '[]'::json),
    'media', coalesce((
      select json_agg(json_build_object('kind', pm.kind, 'url', pm.url, 'caption', pm.caption) order by pm.sort_order)
      from public.project_media pm where pm.project_id = p.id
    ), '[]'::json)
  )
  from proj p;
$$;

grant execute on function public.get_shared_project(uuid, uuid) to anon;
