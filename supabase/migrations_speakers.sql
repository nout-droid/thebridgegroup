-- Sprekersbeheer: registreer sprekers per project, wijs optioneel een podium toe, verzamel hun
-- presentatie (via de bestaande private 'portal-documents'-bucket) en laat de productie notities
-- achter voor de showcaller. Voer dit één keer uit in de Supabase SQL Editor.

create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  name text not null default '',
  title text not null default '',
  company text not null default '',
  bio text not null default '',
  presentation_url text not null default '',
  presentation_filename text not null default '',
  notes_for_showcaller text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists speakers_project_id_idx on public.speakers(project_id);
create index if not exists speakers_stage_id_idx on public.speakers(stage_id);

alter table public.speakers enable row level security;

drop policy if exists "owner full access on speakers" on public.speakers;
create policy "owner full access on speakers" on public.speakers
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- get_shared_rundowns uitgebreid met een top-level 'speakers'-sleutel, zodat de showcaller- en
-- crew-portalen (die al pollen op deze ene RPC) ook de sprekerslijst + notities voor de
-- showcaller binnenkrijgen zonder een aparte RPC-call. De rauwe storage_path lekt niet mee naar
-- anon — downloaden gaat via een aparte, token-geverifieerde route die pas op dat moment tekent.
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
    ), '[]'::json),
    'speakers', coalesce((
      select json_agg(
        json_build_object(
          'id', sp.id,
          'stage_id', sp.stage_id,
          'name', sp.name,
          'title', sp.title,
          'company', sp.company,
          'bio', sp.bio,
          'presentation_filename', sp.presentation_filename,
          'has_presentation', (sp.presentation_url is not null and sp.presentation_url <> ''),
          'notes_for_showcaller', sp.notes_for_showcaller
        ) order by sp.sort_order
      )
      from public.speakers sp
      join proj on true
      where sp.project_id = proj.id
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_rundowns(uuid) to anon;
