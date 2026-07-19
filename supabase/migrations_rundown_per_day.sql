-- Rundowns worden per (project, stage, dag) i.p.v. per (project, stage). Voer dit één keer
-- uit in de Supabase SQL Editor.

alter table public.rundowns add column if not exists show_date date;

update public.rundowns r
set show_date = coalesce(r.show_date, p.show_start_date, p.event_date, current_date)
from public.projects p
where r.project_id = p.id and r.show_date is null;

alter table public.rundowns alter column show_date set not null;
alter table public.rundowns alter column show_date set default current_date;

drop index if exists rundowns_project_stage_unique;
create unique index if not exists rundowns_project_stage_date_unique
  on public.rundowns(project_id, coalesce(stage_id, '00000000-0000-0000-0000-000000000000'::uuid), show_date);

-- get_shared_rundowns: elke scope (stage of projectbreed) blijft altijd bestaan, ook zonder
-- rundowns (nodig voor de auto-aanmaak-flow), maar draagt nu een lijst van rundowns — één
-- per show-dag — i.p.v. maar 1 rundown per stage. Zo kan crew-/showcaller-portal tussen
-- show-dagen wisselen.
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
  stage_list as (
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
          'stage_id', sl.stage_id,
          'stage_name', sl.stage_name,
          'rundowns', coalesce(rd.rundowns, '[]'::json)
        ) order by sl.sort_order
      )
      from stage_list sl
      join proj on true
      left join lateral (
        select json_agg(
          json_build_object(
            'id', r.id,
            'show_date', r.show_date,
            'start_time', r.start_time,
            'is_live', r.is_live,
            'current_item_id', r.current_item_id,
            'current_item_started_at', r.current_item_started_at,
            'actual_start_at', r.actual_start_at,
            'items', coalesce(it.items, '[]'::json)
          ) order by r.show_date
        ) as rundowns
        from public.rundowns r
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
          where ri.rundown_id = r.id
        ) it on true
        where r.project_id = proj.id and r.stage_id is not distinct from sl.stage_id
      ) rd on true
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
    ), '[]'::json),
    'chat', coalesce((
      select json_agg(
        json_build_object(
          'id', m.id,
          'stage_id', m.stage_id,
          'sender', m.sender,
          'message', m.message,
          'created_at', m.created_at
        ) order by m.created_at desc
      )
      from (
        select rcm.* from public.rundown_chat_messages rcm, proj
        where rcm.project_id = proj.id
        order by rcm.created_at desc
        limit 200
      ) m
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_rundowns(uuid) to anon;
