-- Event-begroting schema
-- Voer dit één keer uit in de Supabase SQL Editor van je eigen project.

create extension if not exists pgcrypto;

-- ========== TABLES ==========

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text not null default '',
  event_date date,
  status text not null default 'concept',
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_email text default '',
  contact_phone text default '',
  specialties text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  status text not null default 'concept'
    check (status in ('concept', 'aanvraag_verstuurd', 'offertes_binnen', 'leverancier_gekozen', 'bevestigd')),
  margin_type text not null default 'percentage' check (margin_type in ('percentage', 'fixed')),
  margin_value numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  cost_price numeric not null default 0,
  notes text default '',
  status text not null default 'aangevraagd' check (status in ('aangevraagd', 'ontvangen', 'gekozen')),
  received_at date,
  created_at timestamptz not null default now()
);

create index if not exists categories_project_id_idx on public.categories(project_id);
create index if not exists quotes_category_id_idx on public.quotes(category_id);
create index if not exists quotes_supplier_id_idx on public.quotes(supplier_id);
create index if not exists suppliers_user_id_idx on public.suppliers(user_id);
create index if not exists projects_user_id_idx on public.projects(user_id);

-- ========== ROW LEVEL SECURITY ==========
-- Alleen de eigenaar (producent) mag zijn eigen projecten/leveranciers/categorieën/offertes
-- lezen en bewerken. De publieke klantweergave gaat NIET via directe tabeltoegang, maar via
-- de get_shared_project(...) functie hieronder (SECURITY DEFINER), zodat een klant met een
-- share-link nooit bij andere projecten of leveranciersdata kan.

alter table public.projects enable row level security;
alter table public.suppliers enable row level security;
alter table public.categories enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "owner full access on projects" on public.projects;
create policy "owner full access on projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner full access on suppliers" on public.suppliers;
create policy "owner full access on suppliers" on public.suppliers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner full access on categories" on public.categories;
create policy "owner full access on categories" on public.categories
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "owner full access on quotes" on public.quotes;
create policy "owner full access on quotes" on public.quotes
  for all using (
    exists (
      select 1 from public.categories c
      join public.projects p on p.id = c.project_id
      where c.id = category_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.categories c
      join public.projects p on p.id = c.project_id
      where c.id = category_id and p.user_id = auth.uid()
    )
  );

-- ========== PUBLIC CLIENT SHARE (read-only, via token) ==========

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
          end as client_price
        from public.categories c
        left join lateral (
          select q.cost_price, s.name as supplier_name
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

-- Zet, wanneer een offerte op 'gekozen' wordt gezet, alle andere offertes van diezelfde
-- categorie terug naar 'ontvangen' zodat er maximaal één gekozen leverancier per categorie is.

create or replace function public.choose_quote(p_quote_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_category_id uuid;
begin
  select category_id into v_category_id from public.quotes where id = p_quote_id;

  update public.quotes
  set status = 'ontvangen'
  where category_id = v_category_id and status = 'gekozen' and id <> p_quote_id;

  update public.quotes
  set status = 'gekozen'
  where id = p_quote_id;
end;
$$;

grant execute on function public.choose_quote(uuid) to authenticated;
