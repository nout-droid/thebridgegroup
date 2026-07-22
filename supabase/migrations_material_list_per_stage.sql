-- Materiaallijst was alleen projectbreed te uploaden — voeg stage_id toe zodat elk podium zijn
-- eigen materiaallijst kan krijgen (net als categorieën al per podium of projectbreed werken).
alter table public.material_list_items add column if not exists stage_id uuid references public.stages(id) on delete cascade;
create index if not exists material_list_items_stage_id_idx on public.material_list_items(stage_id);

-- Eén databasecall om meerdere materiaallijst-regels tegelijk te matchen aan een catalogusartikel
-- (i.p.v. één update per regel — zelfde reden als update_catalog_last_seen_prices hierboven).
create or replace function public.update_material_list_matches(
  p_item_ids uuid[],
  p_article_ids uuid[],
  p_prices numeric[]
)
returns void
language sql
security invoker
volatile
as $$
  update public.material_list_items mli
  set matched_article_id = u.article_id, unit_price = u.price
  from unnest(p_item_ids, p_article_ids, p_prices) as u(item_id, article_id, price)
  where mli.id = u.item_id;
$$;

grant execute on function public.update_material_list_matches(uuid[], uuid[], numeric[]) to authenticated;
