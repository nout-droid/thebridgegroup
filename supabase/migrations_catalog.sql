-- Catalogus + materiaallijst-matching
-- Voer dit één keer uit in de Supabase SQL Editor, ná supabase/schema.sql.

create extension if not exists pg_trgm;

-- ========== CATALOGUS ARTIKELEN (per leverancier) ==========

create table if not exists public.catalog_articles (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  external_code text not null default '',
  name text not null,
  category text not null default '',
  properties text default '',
  day_price numeric not null default 0,
  unit text not null default 'per dag',
  created_at timestamptz not null default now(),
  unique (supplier_id, external_code)
);

create index if not exists catalog_articles_supplier_id_idx on public.catalog_articles(supplier_id);
create index if not exists catalog_articles_name_trgm_idx on public.catalog_articles using gin (name gin_trgm_ops);

alter table public.catalog_articles enable row level security;

drop policy if exists "owner full access on catalog_articles" on public.catalog_articles;
create policy "owner full access on catalog_articles" on public.catalog_articles
  for all using (
    exists (select 1 from public.suppliers s where s.id = supplier_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.suppliers s where s.id = supplier_id and s.user_id = auth.uid())
  );

-- ========== MATERIAALLIJST REGELS (per project) ==========

create table if not exists public.material_list_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  raw_description text not null,
  quantity numeric not null default 1,
  unit text default '',
  matched_article_id uuid references public.catalog_articles(id) on delete set null,
  unit_price numeric,
  created_at timestamptz not null default now()
);

create index if not exists material_list_items_project_id_idx on public.material_list_items(project_id);

alter table public.material_list_items enable row level security;

drop policy if exists "owner full access on material_list_items" on public.material_list_items;
create policy "owner full access on material_list_items" on public.material_list_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ========== HUURPERIODE-STAFFEL ==========
-- Bron: Rent-All prijslijst 2025, "Calculation of the rental prices".
-- De starttarief-periode is 1x de dagprijs (1 showdag + max. 3 op-/afbouwdagen).

create table if not exists public.rental_period_multipliers (
  min_days int primary key,
  label text not null,
  multiplier numeric not null
);

insert into public.rental_period_multipliers (min_days, label, multiplier) values
  (1, '1 dag', 1),
  (2, '2 dagen', 1),
  (3, '3 dagen', 1),
  (4, '4 dagen', 1),
  (5, '5 dagen', 1.05),
  (6, '6 dagen', 1.15),
  (7, '7 dagen', 1.25),
  (8, '8 dagen', 1.32),
  (9, '9 dagen', 1.39),
  (10, '10 dagen', 1.46),
  (11, '11 dagen', 1.53),
  (12, '12 dagen', 1.61),
  (13, '13 dagen', 1.68),
  (14, '14 dagen', 1.75),
  (15, '15 dagen', 1.82),
  (16, '16 dagen', 1.89),
  (17, '17 dagen', 1.96),
  (18, '18 dagen', 2.03),
  (19, '19 dagen', 2.11),
  (20, '20 dagen', 2.18),
  (21, '21 dagen', 2.25),
  (28, '4 weken', 2.75),
  (35, '5 weken', 3.25),
  (42, '6 weken', 3.75),
  (49, '7 weken', 4.25),
  (56, '8 weken', 4.75)
on conflict (min_days) do update set label = excluded.label, multiplier = excluded.multiplier;

-- ========== PROJECT: AANTAL HUURDAGEN ==========

alter table public.projects add column if not exists rental_days int not null default 4;

-- ========== MATCH-SUGGESTIES (fuzzy, per gebruiker via RLS) ==========

create or replace function public.suggest_catalog_matches(p_description text, p_limit int default 5)
returns table (
  article_id uuid,
  supplier_id uuid,
  supplier_name text,
  name text,
  category text,
  day_price numeric,
  similarity real
)
language sql
security invoker
stable
as $$
  select ca.id, ca.supplier_id, s.name, ca.name, ca.category, ca.day_price,
         similarity(ca.name, p_description) as similarity
  from public.catalog_articles ca
  join public.suppliers s on s.id = ca.supplier_id
  where ca.name % p_description
  order by similarity desc
  limit p_limit;
$$;

grant execute on function public.suggest_catalog_matches(text, int) to authenticated;

-- ========== RENTAL MULTIPLIER LOOKUP ==========

create or replace function public.rental_multiplier(p_days int)
returns numeric
language sql
security invoker
stable
as $$
  select coalesce(
    (select multiplier from public.rental_period_multipliers where min_days <= p_days order by min_days desc limit 1),
    1
  );
$$;

grant execute on function public.rental_multiplier(int) to authenticated;
