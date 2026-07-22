-- Merk-veld voor gestructureerdere matching (i.p.v. alleen fuzzy tekst op de volledige naam) +
-- een "laatst gezien"-prijs die automatisch bijwerkt zodra een offerte-regel wordt bevestigd.
-- De brontabel-prijs (uit CSV-import) blijft ongemoeid — last_seen_price is puur een actueel
-- "wat hebben we hier laatst voor betaald"-signaal ernaast, geen vervanging.
alter table public.catalog_articles add column if not exists brand text;
update public.catalog_articles set brand = nullif(split_part(trim(name), ' ', 1), '') where brand is null;
create index if not exists catalog_articles_brand_idx on public.catalog_articles (lower(brand));

alter table public.catalog_articles add column if not exists last_seen_price numeric;
alter table public.catalog_articles add column if not exists last_seen_price_at timestamptz;

-- Nieuwe kolommen mogen bij create-or-replace alleen aan het eind van de select-lijst, anders
-- weigert Postgres de view te vervangen.
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
  ca.created_at,
  ca.brand,
  ca.last_seen_price,
  ca.last_seen_price_at
from public.catalog_articles ca
join public.suppliers s on s.id = ca.supplier_id;

-- Extra output-kolommen betekent dat create-or-replace niet volstaat (Postgres staat geen
-- wijziging van het returntype van een bestaande functie toe) — dus eerst droppen.
drop function if exists public.suggest_catalog_matches(text, int);
create function public.suggest_catalog_matches(p_description text, p_limit int default 5)
returns table (
  article_id uuid,
  supplier_id uuid,
  supplier_name text,
  name text,
  category text,
  day_price numeric,
  last_seen_price numeric,
  last_seen_price_at timestamptz,
  similarity real
)
language sql
security invoker
stable
as $$
  select ca.id, ca.supplier_id, ca.supplier_name, ca.name, ca.category, ca.day_price,
         ca.last_seen_price, ca.last_seen_price_at,
         similarity(ca.name, p_description) as similarity
  from public.catalog_articles_net ca
  where ca.name % p_description
  order by
    (case when ca.brand is not null and p_description ilike ca.brand || '%' then 1 else 0 end) desc,
    similarity(ca.name, p_description) desc
  limit p_limit;
$$;

grant execute on function public.suggest_catalog_matches(text, int) to authenticated;

create or replace function public.suggest_catalog_matches_bulk(p_descriptions text[])
returns table (
  idx int,
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
  select d.idx, best.article_id, best.supplier_id, best.supplier_name, best.name, best.category, best.day_price, best.similarity
  from unnest(p_descriptions) with ordinality as d(description, idx)
  left join lateral (
    select ca.id as article_id, ca.supplier_id, ca.supplier_name, ca.name, ca.category, ca.day_price,
           similarity(ca.name, d.description) as similarity
    from public.catalog_articles_net ca
    where ca.name % d.description
    order by
      (case when ca.brand is not null and d.description ilike ca.brand || '%' then 1 else 0 end) desc,
      similarity(ca.name, d.description) desc
    limit 1
  ) best on true
  order by d.idx;
$$;

grant execute on function public.suggest_catalog_matches_bulk(text[]) to authenticated;

-- Eén databasecall om de last_seen_price van meerdere catalogusartikelen tegelijk bij te werken
-- (i.p.v. één update per bevestigde offerteregel).
create or replace function public.update_catalog_last_seen_prices(p_article_ids uuid[], p_prices numeric[])
returns void
language sql
security invoker
volatile
as $$
  update public.catalog_articles ca
  set last_seen_price = u.price, last_seen_price_at = now()
  from unnest(p_article_ids, p_prices) as u(article_id, price)
  where ca.id = u.article_id;
$$;

grant execute on function public.update_catalog_last_seen_prices(uuid[], numeric[]) to authenticated;
