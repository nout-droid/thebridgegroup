-- Eén regel per keer matchen tegen de catalogus (RPC-aanroep) kost bij een offerte met
-- honderden regels honderden losse netwerk-roundtrips naar Supabase — ook parallel met een
-- concurrency-limiet blijft dat traag omdat de effectieve parallelliteit begrensd wordt door
-- de HTTP/verbindingslaag. Deze functie matcht alle regels in één databasecall.
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
    order by similarity desc
    limit 1
  ) best on true
  order by d.idx;
$$;

grant execute on function public.suggest_catalog_matches_bulk(text[]) to authenticated;
