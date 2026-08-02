-- suggest_catalog_matches(_bulk) filterden en sorteerden rechtstreeks op catalog_articles_net
-- (de view met de join naar suppliers, nodig voor de kortings-aangepaste day_price). Doordat
-- suppliers RLS heeft, dwingt Postgres een nested loop af i.p.v. een efficiente join/index-scan
-- — bij 1889 catalogusartikelen kostte één losse match-lookup ~480ms i.p.v. ~20ms. Bij een offerte
-- van 80+ regels liep de RPC daardoor tegen PostgREST's statement-timeout aan, wat stil faalde
-- (geen error zichtbaar, gewoon nul matches). Fix: matchen op de kale catalog_articles-tabel
-- (waar RLS wél efficiënt blijft, geverifieerd: ~20ms) en pas ná het bepalen van de winnaar(s)
-- joinen met suppliers voor de weergave-kolommen.

create or replace function public.suggest_catalog_matches(p_description text, p_limit int default 5)
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
  select top_matches.id, top_matches.supplier_id, s.name as supplier_name, top_matches.name,
         top_matches.category,
         round(top_matches.day_price * (1 - s.default_discount_percentage / 100), 2) as day_price,
         top_matches.last_seen_price, top_matches.last_seen_price_at, top_matches.similarity
  from (
    select ca.id, ca.supplier_id, ca.name, ca.category, ca.day_price,
           ca.last_seen_price, ca.last_seen_price_at,
           greatest(similarity(ca.name, p_description), word_similarity(p_description, ca.name)) as similarity
    from public.catalog_articles ca
    where ca.name % p_description or p_description <% ca.name
    order by
      (case when ca.brand is not null and p_description ilike ca.brand || '%' then 1 else 0 end) desc,
      greatest(similarity(ca.name, p_description), word_similarity(p_description, ca.name)) desc
    limit p_limit
  ) top_matches
  join public.suppliers s on s.id = top_matches.supplier_id
  order by
    (case when top_matches.similarity is not null then 1 else 0 end) desc,
    top_matches.similarity desc;
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
  select d.idx, ca.id as article_id, ca.supplier_id, s.name as supplier_name, ca.name, ca.category,
         round(ca.day_price * (1 - s.default_discount_percentage / 100), 2) as day_price,
         best.similarity
  from unnest(p_descriptions) with ordinality as d(description, idx)
  left join lateral (
    select ca2.id, similarity(ca2.name, d.description) as similarity
    from public.catalog_articles ca2
    where ca2.name % d.description or d.description <% ca2.name
    order by
      (case when ca2.brand is not null and d.description ilike ca2.brand || '%' then 1 else 0 end) desc,
      greatest(similarity(ca2.name, d.description), word_similarity(d.description, ca2.name)) desc
    limit 1
  ) best on true
  left join public.catalog_articles ca on ca.id = best.id
  left join public.suppliers s on s.id = ca.supplier_id
  order by d.idx;
$$;

grant execute on function public.suggest_catalog_matches_bulk(text[]) to authenticated;
