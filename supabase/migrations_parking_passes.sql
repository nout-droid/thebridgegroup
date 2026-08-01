-- Parkeerpassen: de organisator kan per project één of meer parkeerpassen (PDF/afbeelding)
-- uploaden en per pas onafhankelijk kiezen welke portalen 'm mogen zien — crew, gasten en/of
-- aanwezigen (een pas kan voor meerdere doelgroepen tegelijk zichtbaar zijn). Bewust
-- projectbreed, geen toewijzing per persoon. storage_path is een bucket-relatief pad in de
-- bestaande privé "portal-documents"-bucket (geen publieke URL) — zelfde patroon als
-- project_documents/guest_documents.storage_path.
-- Voer dit één keer uit in de Supabase SQL Editor.

create table if not exists public.parking_passes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  storage_path text not null,
  visible_to_crew boolean not null default true,
  visible_to_guests boolean not null default true,
  visible_to_attendees boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists parking_passes_project_id_idx on public.parking_passes(project_id);

alter table public.parking_passes enable row level security;

drop policy if exists "owner full access on parking_passes" on public.parking_passes;
create policy "owner full access on parking_passes" on public.parking_passes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- Anon (portal-bezoekers) hebben geen sessie, dus geen directe SELECT-toegang tot deze tabel —
-- net als bij event_attendees/speakers loopt hun toegang via een SECURITY DEFINER RPC die alleen
-- id + title teruggeeft (nooit storage_path, dat zou het privé bucket-pad aan anon lekken). Het
-- gastenportaal is server-rendered met de admin-client (zelfde patroon als guest_documents in
-- src/app/guest/[token]/page.tsx) en heeft dus geen aparte RPC nodig.

-- get_shared_rundowns uitgebreid met 'parking_passes' voor het crew-portaal (dat al op deze ene
-- RPC pollt) — alleen de passen met visible_to_crew = true, zonder storage_path. Downloaden gaat
-- via /crew/[token]/parking/[passId]/download, dat pas op dat moment tekent (zelfde patroon als
-- de sprekerspresentatie-download hierboven).
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
    ), '[]'::json),
    'parking_passes', coalesce((
      select json_agg(
        json_build_object('id', pp.id, 'title', pp.title) order by pp.created_at desc
      )
      from public.parking_passes pp
      join proj on true
      where pp.project_id = proj.id and pp.visible_to_crew = true
    ), '[]'::json)
  )
  from proj;
$$;

grant execute on function public.get_shared_rundowns(uuid) to anon;

-- get_attendee_home uitgebreid met 'parking_passes' voor het attendee-portaal, zelfde principe:
-- alleen id + title, alleen de passen met visible_to_attendees = true. Downloaden gaat via
-- /attendee/[token]/parking/[passId]/download.
create or replace function public.get_attendee_home(p_attendee_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'attendee', json_build_object(
      'id', a.id,
      'name', a.name,
      'email', a.email,
      'company', a.company,
      'title', a.title,
      'bio', a.bio,
      'photo_url', a.photo_url,
      'networking_opt_in', a.networking_opt_in
    ),
    'project', json_build_object(
      'id', p.id,
      'name', p.name,
      'event_date', p.event_date
    ),
    'agenda', coalesce((
      select json_agg(
        json_build_object(
          'id', si.id,
          'stage_name', st.name,
          'activity_date', si.activity_date,
          'activity_time', si.activity_time,
          'activity', si.activity
        ) order by si.activity_date, si.activity_time, si.sort_order
      )
      from public.schedule_items si
      left join public.stages st on st.id = si.stage_id
      where si.project_id = p.id
    ), '[]'::json),
    'parking_passes', coalesce((
      select json_agg(
        json_build_object('id', pp.id, 'title', pp.title) order by pp.created_at desc
      )
      from public.parking_passes pp
      where pp.project_id = p.id and pp.visible_to_attendees = true
    ), '[]'::json)
  )
  from public.event_attendees a
  join public.projects p on p.id = a.project_id
  where a.id = p_attendee_id;
$$;

grant execute on function public.get_attendee_home(uuid) to anon;
