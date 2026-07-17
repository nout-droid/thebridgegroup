-- Offertes op materiaal-niveau
-- Voer dit één keer uit in de Supabase SQL Editor, ná schema.sql en migrations_catalog.sql.

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  material_list_item_id uuid references public.material_list_items(id) on delete set null,
  catalog_article_id uuid references public.catalog_articles(id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quote_line_items_quote_id_idx on public.quote_line_items(quote_id);

alter table public.quote_line_items enable row level security;

drop policy if exists "owner full access on quote_line_items" on public.quote_line_items;
create policy "owner full access on quote_line_items" on public.quote_line_items
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and p.user_id = auth.uid()
    )
  );

-- Houdt quotes.cost_price automatisch gelijk aan de som van zijn regels,
-- maar alleen zodra een offerte regels heeft (anders blijft het handmatig ingevoerde bedrag staan).

create or replace function public.sync_quote_cost_price()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_quote_id uuid;
  v_line_item_count int;
  v_sum numeric;
begin
  v_quote_id := coalesce(new.quote_id, old.quote_id);

  select count(*), coalesce(sum(quantity * unit_price), 0)
    into v_line_item_count, v_sum
  from public.quote_line_items
  where quote_id = v_quote_id;

  if v_line_item_count > 0 then
    update public.quotes set cost_price = v_sum where id = v_quote_id;
  end if;

  return null;
end;
$$;

drop trigger if exists quote_line_items_sync on public.quote_line_items;
create trigger quote_line_items_sync
  after insert or update or delete on public.quote_line_items
  for each row execute function public.sync_quote_cost_price();

-- Klantweergave: neem de materiaal-breakdown van de gekozen offerte mee (open begroting).

create or replace function public.get_shared_project(p_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'project', json_build_object(
      'name', p.name,
      'client_name', p.client_name,
      'event_date', p.event_date,
      'status', p.status
    ),
    'categories', coalesce((
      select json_agg(cat_data order by cat_data.sort_order)
      from (
        select
          c.id,
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
        where c.project_id = p.id
      ) cat_data
    ), '[]'::json)
  )
  from public.projects p
  where p.share_token = p_token;
$$;

grant execute on function public.get_shared_project(uuid) to anon;
