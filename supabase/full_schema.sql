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
-- Stages/podia als aparte pagina's binnen een project
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stages_project_id_idx on public.stages(project_id);

alter table public.stages enable row level security;

drop policy if exists "owner full access on stages" on public.stages;
create policy "owner full access on stages" on public.stages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- null = projectbrede categorie (bv. Transport, Crew, Hotel), anders hoort de categorie bij die stage.
alter table public.categories add column if not exists stage_id uuid references public.stages(id) on delete cascade;

create index if not exists categories_stage_id_idx on public.categories(stage_id);
-- Matching-geheugen: onthoud bevestigde koppelingen tussen een omschrijving en een catalogusartikel,
-- zodat dezelfde omschrijving bij een volgende materiaallijst/offerte-import automatisch herkend wordt.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.article_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  article_id uuid not null references public.catalog_articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, raw_text)
);

create index if not exists article_aliases_user_id_idx on public.article_aliases(user_id);

alter table public.article_aliases enable row level security;

drop policy if exists "owner full access on article_aliases" on public.article_aliases;
create policy "owner full access on article_aliases" on public.article_aliases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Leveranciers-korting: prijslijsten zijn bruto, Nout krijgt een vast kortingspercentage.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.suppliers add column if not exists default_discount_percentage numeric not null default 0;

-- Netto catalogusprijzen (bruto dagprijs minus leverancierskorting). RLS van de onderliggende
-- tabellen blijft gelden dankzij security_invoker, dus deze view lekt geen data tussen gebruikers.
create or replace view public.catalog_articles_net
with (security_invoker = true) as
select
  ca.id,
  ca.supplier_id,
  s.name as supplier_name,
  ca.external_code,
  ca.name,
  ca.category,
  ca.properties,
  round(ca.day_price * (1 - s.default_discount_percentage / 100), 2) as day_price,
  ca.unit,
  ca.created_at
from public.catalog_articles ca
join public.suppliers s on s.id = ca.supplier_id;

-- suggest_catalog_matches gebruikt nu de netto-prijs view i.p.v. de ruwe (bruto) tabel.
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
  select ca.id, ca.supplier_id, ca.supplier_name, ca.name, ca.category, ca.day_price,
         similarity(ca.name, p_description) as similarity
  from public.catalog_articles_net ca
  where ca.name % p_description
  order by similarity desc
  limit p_limit;
$$;

grant execute on function public.suggest_catalog_matches(text, int) to authenticated;
-- Klantpagina-content: achtergrond + media (foto's/video-links) per project.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

-- Paden in deze bucket volgen de conventie: projects/{project_id}/... zodat de RLS-policy
-- hieronder kan controleren of het project van de ingelogde gebruiker is.

drop policy if exists "owner insert project-media" on storage.objects;
create policy "owner insert project-media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
    )
  );

drop policy if exists "owner update project-media" on storage.objects;
create policy "owner update project-media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
    )
  );

drop policy if exists "owner delete project-media" on storage.objects;
create policy "owner delete project-media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
    )
  );

alter table public.projects add column if not exists background_image_url text;

create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('photo', 'video_link')),
  url text not null,
  caption text default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_media_project_id_idx on public.project_media(project_id);

alter table public.project_media enable row level security;

drop policy if exists "owner full access on project_media" on public.project_media;
create policy "owner full access on project_media" on public.project_media
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
-- Klantweergave: achtergrond + media (foto's/video-links) meenemen.
-- Voer dit één keer uit in de Supabase SQL Editor, ná migrations_media.sql en migrations_stages_share.sql.

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
      'background_image_url', p.background_image_url
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
-- Klant-login met Event ID + wachtwoord (i.p.v. alleen een geheime link).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.projects add column if not exists event_code text;
alter table public.projects add column if not exists client_password_hash text;

update public.projects
set event_code = upper(substr(md5(random()::text || id::text), 1, 6))
where event_code is null;

alter table public.projects alter column event_code set not null;
create unique index if not exists projects_event_code_idx on public.projects (event_code);

-- Geeft het share_token terug bij een geldige Event ID + wachtwoord combinatie, anders null.
-- security definer zodat de publieke inlogpagina dit kan aanroepen zonder rechtstreekse
-- tabeltoegang tot projects (die alleen de eigenaar mag lezen).

create or replace function public.verify_client_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and client_password_hash is not null
    and client_password_hash = crypt(p_password, client_password_hash)
  limit 1;
$$;

grant execute on function public.verify_client_login(text, text) to anon;

-- Zet (of wijzigt) het klantwachtwoord van een project. security invoker: de bestaande
-- eigenaar-RLS-policy op projects zorgt dat dit alleen de eigen projecten kan raken.

create or replace function public.set_client_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set client_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_client_password(uuid, text) to authenticated;
-- Leveranciers- en gastenportaal (met versiegeschiedenis van geuploade documenten).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

-- ========== LEVERANCIER PORTAAL-LOGIN ==========

alter table public.suppliers add column if not exists portal_code text;
alter table public.suppliers add column if not exists portal_password_hash text;

create unique index if not exists suppliers_portal_code_idx on public.suppliers (portal_code)
  where portal_code is not null;

create or replace function public.verify_supplier_login(p_portal_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select id from public.suppliers
  where upper(portal_code) = upper(p_portal_code)
    and portal_password_hash is not null
    and portal_password_hash = crypt(p_password, portal_password_hash)
  limit 1;
$$;

grant execute on function public.verify_supplier_login(text, text) to anon;

create or replace function public.set_supplier_password(p_supplier_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.suppliers
  set portal_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_supplier_id;
$$;

grant execute on function public.set_supplier_password(uuid, text) to authenticated;

-- ========== OFFERTE-DOCUMENTEN (versiegeschiedenis, append-only) ==========

create table if not exists public.quote_documents (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  uploaded_by text not null check (uploaded_by in ('owner', 'supplier')),
  storage_path text not null,
  original_filename text not null default '',
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quote_documents_quote_id_idx on public.quote_documents(quote_id);

alter table public.quote_documents enable row level security;

-- Eigenaar (Nout) mag alles zien/beheren via de bestaande project-keten.
drop policy if exists "owner full access on quote_documents" on public.quote_documents;
create policy "owner full access on quote_documents" on public.quote_documents
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

-- Leveranciers hebben geen Supabase-sessie (eigen cookie-login), dus schrijven/lezen namens
-- hen loopt via de service-role client in de app, ná een eigen autorisatie-check in Next.js.
-- Daarom bewust geen extra RLS-policy voor "supplier"-toegang hier.

-- ========== GASTEN PORTAAL-LOGIN + DOCUMENTEN ==========

alter table public.projects add column if not exists guest_password_hash text;

create or replace function public.verify_guest_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and guest_password_hash is not null
    and guest_password_hash = crypt(p_password, guest_password_hash)
  limit 1;
$$;

grant execute on function public.verify_guest_login(text, text) to anon;

create or replace function public.set_guest_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set guest_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_guest_password(uuid, text) to authenticated;

create table if not exists public.guest_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  storage_path text not null,
  original_filename text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists guest_documents_project_id_idx on public.guest_documents(project_id);

alter table public.guest_documents enable row level security;

drop policy if exists "owner full access on guest_documents" on public.guest_documents;
create policy "owner full access on guest_documents" on public.guest_documents
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ========== PRIVATE STORAGE BUCKET ==========
-- Niet public: downloads voor leveranciers/gasten lopen via server-side signed URLs
-- (service-role client), na een eigen autorisatie-check in de Next.js server actions.

insert into storage.buckets (id, name, public)
values ('portal-documents', 'portal-documents', false)
on conflict (id) do nothing;

drop policy if exists "owner access portal-documents" on storage.objects;
create policy "owner access portal-documents" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'portal-documents'
    and (
      exists (
        select 1 from public.quotes q
        join public.categories c on c.id = q.category_id
        join public.projects p on p.id = c.project_id
        where q.id::text = (storage.foldername(storage.objects.name))[2] and p.user_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(storage.objects.name))[2] and p.user_id = auth.uid()
      )
    )
  );
-- Festival rider: gestructureerd document, gedeeltelijk klant-bewerkbaar.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.rider_sections (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  title text not null,
  content text not null default '',
  editable_by_client boolean not null default false,
  sort_order int not null default 0,
  updated_by text not null default 'owner' check (updated_by in ('owner', 'client')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists rider_sections_rider_id_idx on public.rider_sections(rider_id);

alter table public.riders enable row level security;
alter table public.rider_sections enable row level security;

drop policy if exists "owner full access on riders" on public.riders;
create policy "owner full access on riders" on public.riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "owner full access on rider_sections" on public.rider_sections;
create policy "owner full access on rider_sections" on public.rider_sections
  for all using (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and p.user_id = auth.uid()
    )
  );

-- Houdt riders.version en updated_at automatisch bij zodra secties wijzigen
-- (zelfde patroon als de quote_line_items -> quotes.cost_price sync-trigger).

create or replace function public.bump_rider_version()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_rider_id uuid;
begin
  v_rider_id := coalesce(new.rider_id, old.rider_id);
  update public.riders
  set version = version + 1, updated_at = now()
  where id = v_rider_id;
  return null;
end;
$$;

drop trigger if exists rider_sections_bump_version on public.rider_sections;
create trigger rider_sections_bump_version
  after insert or update or delete on public.rider_sections
  for each row execute function public.bump_rider_version();

-- Klant mag alleen de inhoud van een sectie bijwerken die expliciet is vrijgegeven
-- (editable_by_client = true), en alleen binnen het project van zijn eigen share_token.

create or replace function public.update_rider_section_by_client(
  p_share_token uuid,
  p_section_id uuid,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.rider_sections rs
  set content = p_content, updated_by = 'client', updated_at = now()
  from public.riders r
  join public.projects p on p.id = r.project_id
  where rs.rider_id = r.id
    and rs.id = p_section_id
    and rs.editable_by_client = true
    and p.share_token = p_share_token;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.update_rider_section_by_client(uuid, uuid, text) to anon;

-- Rider + secties voor de klantweergave (los van get_shared_project, blijft zo overzichtelijk).

create or replace function public.get_shared_rider(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'version', r.version,
    'updated_at', r.updated_at,
    'sections', coalesce((
      select json_agg(
        json_build_object(
          'id', rs.id,
          'title', rs.title,
          'content', rs.content,
          'editable_by_client', rs.editable_by_client
        ) order by rs.sort_order
      )
      from public.rider_sections rs
      where rs.rider_id = r.id
    ), '[]'::json)
  )
  from public.riders r
  join public.projects p on p.id = r.project_id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_rider(uuid) to anon;
-- Losse regels binnen een rider-onderdeel (bv. extra lampen/speakers toevoegen aan "Techniek").
-- Voer dit één keer uit in de Supabase SQL Editor, ná migrations_rider.sql.

create table if not exists public.rider_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.rider_sections(id) on delete cascade,
  description text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rider_section_items_section_id_idx on public.rider_section_items(section_id);

alter table public.rider_section_items enable row level security;

drop policy if exists "owner full access on rider_section_items" on public.rider_section_items;
create policy "owner full access on rider_section_items" on public.rider_section_items
  for all using (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and p.user_id = auth.uid()
    )
  );

-- Zelfde versiebump als rider_sections, maar dan via section_id -> rider_id.

create or replace function public.bump_rider_version_from_item()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_section_id uuid;
  v_rider_id uuid;
begin
  v_section_id := coalesce(new.section_id, old.section_id);
  select rider_id into v_rider_id from public.rider_sections where id = v_section_id;
  if v_rider_id is not null then
    update public.riders
    set version = version + 1, updated_at = now()
    where id = v_rider_id;
  end if;
  return null;
end;
$$;

drop trigger if exists rider_section_items_bump_version on public.rider_section_items;
create trigger rider_section_items_bump_version
  after insert or update or delete on public.rider_section_items
  for each row execute function public.bump_rider_version_from_item();

-- get_shared_rider: nu ook de regels per onderdeel meegeven aan de klantweergave/PDF.

create or replace function public.get_shared_rider(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'version', r.version,
    'updated_at', r.updated_at,
    'sections', coalesce((
      select json_agg(
        json_build_object(
          'id', rs.id,
          'title', rs.title,
          'content', rs.content,
          'editable_by_client', rs.editable_by_client,
          'items', coalesce((
            select json_agg(
              json_build_object('id', rsi.id, 'description', rsi.description)
              order by rsi.sort_order
            )
            from public.rider_section_items rsi
            where rsi.section_id = rs.id
          ), '[]'::json)
        ) order by rs.sort_order
      )
      from public.rider_sections rs
      where rs.rider_id = r.id
    ), '[]'::json)
  )
  from public.riders r
  join public.projects p on p.id = r.project_id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_rider(uuid) to anon;
-- Draaiboek: tijdlijn van activiteiten, projectbreed of per stage (zelfde patroon als
-- categories.stage_id) — volledig gescheiden weergaves, geen samengevoegd overzicht.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  activity_date date not null,
  activity_time time not null,
  activity text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  priority text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists schedule_items_project_id_idx on public.schedule_items(project_id);
create index if not exists schedule_items_stage_id_idx on public.schedule_items(stage_id);

alter table public.schedule_items enable row level security;

drop policy if exists "owner full access on schedule_items" on public.schedule_items;
create policy "owner full access on schedule_items" on public.schedule_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
-- Productieplanning: crew & accreditatie, materieel, comms/portofoons, catering,
-- artiestenriders, open vragen en notulen. Allemaal projectbreed (geen stage-koppeling).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  role text not null default '',
  access_level text not null default '',
  id_number text not null default '',
  accredited boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists crew_members_project_id_idx on public.crew_members(project_id);

alter table public.crew_members enable row level security;

drop policy if exists "owner full access on crew_members" on public.crew_members;
create policy "owner full access on crew_members" on public.crew_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.equipment_reservations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  machine_type text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  quantity int not null default 1,
  accessories text not null default '',
  reservation_date date,
  duration text not null default '',
  machine_number text not null default '',
  picked_up boolean not null default false,
  key_holder text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists equipment_reservations_project_id_idx on public.equipment_reservations(project_id);

alter table public.equipment_reservations enable row level security;

drop policy if exists "owner full access on equipment_reservations" on public.equipment_reservations;
create policy "owner full access on equipment_reservations" on public.equipment_reservations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.comms_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'intercom',
  user_name text not null default '',
  device_type text not null default '',
  channels text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists comms_assignments_project_id_idx on public.comms_assignments(project_id);

alter table public.comms_assignments enable row level security;

drop policy if exists "owner full access on comms_assignments" on public.comms_assignments;
create policy "owner full access on comms_assignments" on public.comms_assignments
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.catering_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  order_date date not null,
  party text not null default '',
  crew_lunch int not null default 0,
  veggie_lunch int not null default 0,
  crew_dinner int not null default 0,
  veggie_dinner int not null default 0,
  night_snacks int not null default 0,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists catering_orders_project_id_idx on public.catering_orders(project_id);

alter table public.catering_orders enable row level security;

drop policy if exists "owner full access on catering_orders" on public.catering_orders;
create policy "owner full access on catering_orders" on public.catering_orders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.artist_riders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  artist_name text not null default '',
  rider_received boolean not null default false,
  notes text not null default '',
  own_light_operator boolean not null default false,
  own_audio_operator boolean not null default false,
  rider_link text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists artist_riders_project_id_idx on public.artist_riders(project_id);

alter table public.artist_riders enable row level security;

drop policy if exists "owner full access on artist_riders" on public.artist_riders;
create policy "owner full access on artist_riders" on public.artist_riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.open_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question text not null default '',
  answer text not null default '',
  pending boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists open_questions_project_id_idx on public.open_questions(project_id);

alter table public.open_questions enable row level security;

drop policy if exists "owner full access on open_questions" on public.open_questions;
create policy "owner full access on open_questions" on public.open_questions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meeting_notes_project_id_idx on public.meeting_notes(project_id);

alter table public.meeting_notes enable row level security;

drop policy if exists "owner full access on meeting_notes" on public.meeting_notes;
create policy "owner full access on meeting_notes" on public.meeting_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
-- Show rundown: cue-by-cue uitvoering van de show zelf, met automatisch
-- doorschuivende tijden en live tracking die real-time meesynct via Supabase
-- Realtime. Zelfde stage_id-nullable patroon als categories/schedule_items.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.rundowns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  start_time time not null default '19:00',
  is_live boolean not null default false,
  current_item_id uuid,
  current_item_started_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists rundowns_project_stage_unique
  on public.rundowns(project_id, coalesce(stage_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.rundowns enable row level security;

drop policy if exists "owner full access on rundowns" on public.rundowns;
create policy "owner full access on rundowns" on public.rundowns
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.rundown_items (
  id uuid primary key default gen_random_uuid(),
  rundown_id uuid not null references public.rundowns(id) on delete cascade,
  cue_number text not null default '',
  name text not null default '',
  duration_seconds int not null default 60,
  responsible text not null default '',
  notes text not null default '',
  color text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rundown_items_rundown_id_idx on public.rundown_items(rundown_id);

alter table public.rundown_items enable row level security;

drop policy if exists "owner full access on rundown_items" on public.rundown_items;
create policy "owner full access on rundown_items" on public.rundown_items
  for all using (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and p.user_id = auth.uid()
    )
  );

-- Realtime aanzetten voor beide tabellen, idempotent (voorkomt een fout als
-- de tabel al in de publicatie zit wanneer dit script opnieuw wordt gedraaid).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rundowns'
  ) then
    alter publication supabase_realtime add table public.rundowns;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rundown_items'
  ) then
    alter publication supabase_realtime add table public.rundown_items;
  end if;
end $$;
-- Crew-portal (live meekijken + notes per devisie) en showcaller-portal
-- (live show bedienen + rundown editen), zelfde login/cookie-patroon als
-- klant/gast/leverancier. Voer dit één keer uit in de Supabase SQL Editor,
-- ná de eerdere migraties (inclusief migrations_rundown.sql).

-- ========== CREW PORTAAL-LOGIN ==========

alter table public.projects add column if not exists crew_password_hash text;

create or replace function public.verify_crew_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and crew_password_hash is not null
    and crew_password_hash = crypt(p_password, crew_password_hash)
  limit 1;
$$;

grant execute on function public.verify_crew_login(text, text) to anon;

create or replace function public.set_crew_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set crew_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_crew_password(uuid, text) to authenticated;

-- ========== SHOWCALLER PORTAAL-LOGIN ==========

alter table public.projects add column if not exists showcaller_password_hash text;

create or replace function public.verify_showcaller_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and showcaller_password_hash is not null
    and showcaller_password_hash = crypt(p_password, showcaller_password_hash)
  limit 1;
$$;

grant execute on function public.verify_showcaller_login(text, text) to anon;

create or replace function public.set_showcaller_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set showcaller_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_showcaller_password(uuid, text) to authenticated;

-- ========== NOTES PER DEVISIE ==========

create table if not exists public.crew_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  division text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists crew_notes_project_id_idx on public.crew_notes(project_id);

alter table public.crew_notes enable row level security;

drop policy if exists "owner full access on crew_notes" on public.crew_notes;
create policy "owner full access on crew_notes" on public.crew_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Crew heeft geen Supabase-sessie (eigen cookie-login), dus notes toevoegen
-- loopt via onderstaande security-definer RPC, niet via een RLS-policy.

create or replace function public.add_crew_note(
  p_token uuid,
  p_stage_id uuid,
  p_division text,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects
  where share_token = p_token and crew_password_hash is not null;

  if v_project_id is null or coalesce(trim(p_note), '') = '' then
    return false;
  end if;

  insert into public.crew_notes (project_id, stage_id, division, note)
  values (v_project_id, p_stage_id, coalesce(nullif(trim(p_division), ''), 'Overig'), trim(p_note));

  return true;
end;
$$;

grant execute on function public.add_crew_note(uuid, uuid, text, text) to anon;

-- ========== GEDEELDE LEESFUNCTIE: RUNDOWNS + ITEMS + NOTES ==========
-- Gebruikt door zowel de crew- als de showcaller-portal om (via polling)
-- live mee te kijken zonder een Supabase-sessie. Geeft per scope (projectbreed
-- + elke stage) de rundown-header en cue-lijst terug, plus de laatste notes.

create or replace function public.get_shared_rundowns(p_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select id, name, event_date from public.projects where share_token = p_token
  ),
  scopes as (
    select null::uuid as stage_id, null::text as stage_name, 0 as sort_order
    from proj
    union all
    select s.id, s.name, s.sort_order + 1
    from public.stages s
    join proj on proj.id = s.project_id
  )
  select json_build_object(
    'project', (select json_build_object('name', name, 'event_date', event_date) from proj),
    'scopes', coalesce((
      select json_agg(
        json_build_object(
          'stage_id', sc.stage_id,
          'stage_name', sc.stage_name,
          'rundown', rd.rundown,
          'items', coalesce(it.items, '[]'::json)
        ) order by sc.sort_order
      )
      from scopes sc
      left join lateral (
        select
          json_build_object(
            'id', r.id,
            'start_time', r.start_time,
            'is_live', r.is_live,
            'current_item_id', r.current_item_id,
            'current_item_started_at', r.current_item_started_at
          ) as rundown,
          r.id as rundown_id
        from public.rundowns r, proj
        where r.project_id = proj.id
          and r.stage_id is not distinct from sc.stage_id
        limit 1
      ) rd on true
      left join lateral (
        select json_agg(
          json_build_object(
            'id', ri.id,
            'cue_number', ri.cue_number,
            'name', ri.name,
            'duration_seconds', ri.duration_seconds,
            'divisions', ri.divisions,
            'notes', ri.notes,
            'color', ri.color,
            'sort_order', ri.sort_order
          ) order by ri.sort_order
        ) as items
        from public.rundown_items ri
        where ri.rundown_id = rd.rundown_id
      ) it on true
    ), '[]'::json),
    'notes', coalesce((
      select json_agg(
        json_build_object(
          'id', n.id,
          'stage_id', n.stage_id,
          'division', n.division,
          'note', n.note,
          'created_at', n.created_at
        ) order by n.created_at desc
      )
      from (
        select cn.* from public.crew_notes cn, proj
        where cn.project_id = proj.id
        order by cn.created_at desc
        limit 200
      ) n
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_rundowns(uuid) to anon;
-- Een cue kan meerdere devisies raken (Audio, Licht, GFX, Playout, Pyro, ...),
-- dus "responsible" (één vrij tekstveld) wordt "divisions" (tekst-array).
-- Voer dit één keer uit in de Supabase SQL Editor, ná migrations_rundown.sql.

alter table public.rundown_items add column if not exists divisions text[] not null default '{}'::text[];

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rundown_items' and column_name = 'responsible'
  ) then
    update public.rundown_items
    set divisions = string_to_array(nullif(trim(responsible), ''), ',')
    where responsible is not null and trim(responsible) <> '';

    alter table public.rundown_items drop column responsible;
  end if;
end $$;


-- Elke cue kan meerdere concrete opdrachten per devisie hebben (bv. "Audio —
-- HH 1 open zetten"), dus de losse divisions-tags worden vervangen door een
-- lijst met devisie + opdracht-regels. Voer dit één keer uit in de Supabase
-- SQL Editor, ná migrations_rundown_divisions.sql.

create table if not exists public.rundown_item_instructions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.rundown_items(id) on delete cascade,
  division text not null default '',
  instruction text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rundown_item_instructions_item_id_idx on public.rundown_item_instructions(item_id);

alter table public.rundown_item_instructions enable row level security;

drop policy if exists "owner full access on rundown_item_instructions" on public.rundown_item_instructions;
create policy "owner full access on rundown_item_instructions" on public.rundown_item_instructions
  for all using (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and p.user_id = auth.uid()
    )
  );

alter table public.rundown_items drop column if exists divisions;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rundown_item_instructions'
  ) then
    alter publication supabase_realtime add table public.rundown_item_instructions;
  end if;
end $$;


-- Update van get_shared_rundowns: geeft nu per cue de opdrachten-per-devisie
-- lijst terug i.p.v. het oude divisions-tekst-array. Voer dit één keer uit
-- in de Supabase SQL Editor, ná migrations_rundown_instructions.sql.

create or replace function public.get_shared_rundowns(p_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select id, name, event_date from public.projects where share_token = p_token
  ),
  scopes as (
    select null::uuid as stage_id, null::text as stage_name, 0 as sort_order
    from proj
    union all
    select s.id, s.name, s.sort_order + 1
    from public.stages s
    join proj on proj.id = s.project_id
  )
  select json_build_object(
    'project', (select json_build_object('name', name, 'event_date', event_date) from proj),
    'scopes', coalesce((
      select json_agg(
        json_build_object(
          'stage_id', sc.stage_id,
          'stage_name', sc.stage_name,
          'rundown', rd.rundown,
          'items', coalesce(it.items, '[]'::json)
        ) order by sc.sort_order
      )
      from scopes sc
      left join lateral (
        select
          json_build_object(
            'id', r.id,
            'start_time', r.start_time,
            'is_live', r.is_live,
            'current_item_id', r.current_item_id,
            'current_item_started_at', r.current_item_started_at
          ) as rundown,
          r.id as rundown_id
        from public.rundowns r, proj
        where r.project_id = proj.id
          and r.stage_id is not distinct from sc.stage_id
        limit 1
      ) rd on true
      left join lateral (
        select json_agg(
          json_build_object(
            'id', ri.id,
            'cue_number', ri.cue_number,
            'name', ri.name,
            'duration_seconds', ri.duration_seconds,
            'notes', ri.notes,
            'color', ri.color,
            'sort_order', ri.sort_order,
            'instructions', coalesce((
              select json_agg(
                json_build_object(
                  'id', rii.id,
                  'division', rii.division,
                  'instruction', rii.instruction
                ) order by rii.sort_order
              )
              from public.rundown_item_instructions rii
              where rii.item_id = ri.id
            ), '[]'::json)
          ) order by ri.sort_order
        ) as items
        from public.rundown_items ri
        where ri.rundown_id = rd.rundown_id
      ) it on true
    ), '[]'::json),
    'notes', coalesce((
      select json_agg(
        json_build_object(
          'id', n.id,
          'stage_id', n.stage_id,
          'division', n.division,
          'note', n.note,
          'created_at', n.created_at
        ) order by n.created_at desc
      )
      from (
        select cn.* from public.crew_notes cn, proj
        where cn.project_id = proj.id
        order by cn.created_at desc
        limit 200
      ) n
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_rundowns(uuid) to anon;


-- Nieuwe kolom om de daadwerkelijke starttijd van de show vast te leggen
-- (los van start_time, dat is enkel de geplande klok-tijd voor weergave).
-- Hiermee kan de totale opgelopen overtijd over de hele show berekend
-- worden (som van vertraging van alle voorgaande cues + overtijd van de
-- huidige cue), niet alleen de overtijd van de huidige cue op zich.
alter table public.rundowns add column if not exists actual_start_at timestamptz;


-- Update van get_shared_rundowns: geeft nu ook actual_start_at van de
-- rundown terug, zodat showcaller/crew/klok-weergaven de totale opgelopen
-- overtijd over de hele show kunnen berekenen. Voer dit één keer uit in de
-- Supabase SQL Editor, ná migrations_rundown_overtime.sql.

create or replace function public.get_shared_rundowns(p_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select id, name, event_date from public.projects where share_token = p_token
  ),
  scopes as (
    select null::uuid as stage_id, null::text as stage_name, 0 as sort_order
    from proj
    union all
    select s.id, s.name, s.sort_order + 1
    from public.stages s
    join proj on proj.id = s.project_id
  )
  select json_build_object(
    'project', (select json_build_object('name', name, 'event_date', event_date) from proj),
    'scopes', coalesce((
      select json_agg(
        json_build_object(
          'stage_id', sc.stage_id,
          'stage_name', sc.stage_name,
          'rundown', rd.rundown,
          'items', coalesce(it.items, '[]'::json)
        ) order by sc.sort_order
      )
      from scopes sc
      left join lateral (
        select
          json_build_object(
            'id', r.id,
            'start_time', r.start_time,
            'is_live', r.is_live,
            'current_item_id', r.current_item_id,
            'current_item_started_at', r.current_item_started_at,
            'actual_start_at', r.actual_start_at
          ) as rundown,
          r.id as rundown_id
        from public.rundowns r, proj
        where r.project_id = proj.id
          and r.stage_id is not distinct from sc.stage_id
        limit 1
      ) rd on true
      left join lateral (
        select json_agg(
          json_build_object(
            'id', ri.id,
            'cue_number', ri.cue_number,
            'name', ri.name,
            'duration_seconds', ri.duration_seconds,
            'notes', ri.notes,
            'color', ri.color,
            'sort_order', ri.sort_order,
            'instructions', coalesce((
              select json_agg(
                json_build_object(
                  'id', rii.id,
                  'division', rii.division,
                  'instruction', rii.instruction
                ) order by rii.sort_order
              )
              from public.rundown_item_instructions rii
              where rii.item_id = ri.id
            ), '[]'::json)
          ) order by ri.sort_order
        ) as items
        from public.rundown_items ri
        where ri.rundown_id = rd.rundown_id
      ) it on true
    ), '[]'::json),
    'notes', coalesce((
      select json_agg(
        json_build_object(
          'id', n.id,
          'stage_id', n.stage_id,
          'division', n.division,
          'note', n.note,
          'created_at', n.created_at
        ) order by n.created_at desc
      )
      from (
        select cn.* from public.crew_notes cn, proj
        where cn.project_id = proj.id
        order by cn.created_at desc
        limit 200
      ) n
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_rundowns(uuid) to anon;
