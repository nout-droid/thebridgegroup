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
