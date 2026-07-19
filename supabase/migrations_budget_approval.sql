-- Klant-goedkeuring van de begroting: goedkeuren / aanpassing vragen / weigeren,
-- met een toelichting bij de laatste twee. Voer dit één keer uit in de Supabase SQL Editor,
-- ná migrations_activity_log.sql (deze functie schrijft ook naar activity_log).

alter table public.projects add column if not exists budget_approval_status text not null default 'pending'
  check (budget_approval_status in ('pending', 'approved', 'changes_requested', 'rejected'));
alter table public.projects add column if not exists budget_approval_comment text;
alter table public.projects add column if not exists budget_approval_at timestamptz;

create or replace function public.respond_to_budget_by_client(
  p_share_token uuid,
  p_status text,
  p_comment text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if p_status not in ('approved', 'changes_requested', 'rejected') then
    return false;
  end if;

  select id into v_project_id from public.projects where share_token = p_share_token;
  if v_project_id is null then
    return false;
  end if;

  update public.projects
  set budget_approval_status = p_status,
      budget_approval_comment = p_comment,
      budget_approval_at = now()
  where id = v_project_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (
    v_project_id, 'client', 'Klant', 'begroting',
    case p_status
      when 'approved' then 'Begroting goedgekeurd'
      when 'changes_requested' then 'Aanpassing gevraagd: ' || coalesce(nullif(trim(p_comment), ''), '(geen toelichting)')
      else 'Begroting geweigerd: ' || coalesce(nullif(trim(p_comment), ''), '(geen toelichting)')
    end
  );

  return true;
end;
$$;

grant execute on function public.respond_to_budget_by_client(uuid, text, text) to anon;

-- get_shared_project: nu ook de goedkeuringsstatus meegeven, zodat de klant zijn eigen
-- eerdere reactie terugziet.
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
      chosen.cost_price,
      chosen.supplier_name,
      case
        when chosen.cost_price is null then null
        when c.margin_type = 'percentage' then round(chosen.cost_price * (1 + c.margin_value / 100), 2)
        else chosen.cost_price + c.margin_value
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
      'budget_approval_comment', p.budget_approval_comment
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
