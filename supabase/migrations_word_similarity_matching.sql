-- pg_trgm's %-operator (volledige-string similarity) presteert slecht bij korte zoektermen
-- (bv. "CLF" tegen een lange catalogusnaam) omdat de lengteverschillen de score verlagen.
-- word_similarity is juist ontworpen om te checken of de korte tekst als "woord" ergens in de
-- langere tekst voorkomt — combineer beide voor betere resultaten bij zowel korte zoektermen
-- als volledige offerte/materiaallijst-regels.
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
  select ca.id, ca.supplier_id, ca.supplier_name, ca.name, ca.category, ca.day_price,
         ca.last_seen_price, ca.last_seen_price_at,
         greatest(similarity(ca.name, p_description), word_similarity(p_description, ca.name)) as similarity
  from public.catalog_articles_net ca
  where ca.name % p_description or p_description <% ca.name
  order by
    (case when ca.brand is not null and p_description ilike ca.brand || '%' then 1 else 0 end) desc,
    greatest(similarity(ca.name, p_description), word_similarity(p_description, ca.name)) desc
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
           greatest(similarity(ca.name, d.description), word_similarity(d.description, ca.name)) as similarity
    from public.catalog_articles_net ca
    where ca.name % d.description or d.description <% ca.name
    order by
      (case when ca.brand is not null and d.description ilike ca.brand || '%' then 1 else 0 end) desc,
      greatest(similarity(ca.name, d.description), word_similarity(d.description, ca.name)) desc
    limit 1
  ) best on true
  order by d.idx;
$$;

grant execute on function public.suggest_catalog_matches_bulk(text[]) to authenticated;
