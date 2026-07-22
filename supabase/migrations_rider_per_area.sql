-- Rider was strikt projectbreed (riders.project_id is unique — één rider-"document" per
-- project). Sommige secties (bv. "Stage informatie": afmetingen, rigging-hoogte, laadcapaciteit)
-- zijn per podium/area verschillend. Voeg stage_id toe aan rider_sections (net als
-- categories.stage_id / schedule_items.stage_id): NULL = projectbreed, gezet = area-specifiek.
alter table public.rider_sections add column if not exists stage_id uuid references public.stages(id) on delete cascade;
create index if not exists rider_sections_stage_id_idx on public.rider_sections(stage_id);

-- get_shared_rider gaf alleen de projectbrede sectielijst terug — nu ook stage_id + stage-naam
-- (voor labeling in de klantportal-weergave, die nog geen aparte area-tabs heeft). Returntype
-- (json) blijft ongewijzigd zodat create-or-replace volstaat zonder de functie te droppen.
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
          'stage_id', rs.stage_id,
          'stage_name', s.name,
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
      left join public.stages s on s.id = rs.stage_id
      where rs.rider_id = r.id
    ), '[]'::json)
  )
  from public.riders r
  join public.projects p on p.id = r.project_id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_rider(uuid) to anon;
