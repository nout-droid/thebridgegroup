-- Rundown-chat: chatkanaal tussen crew en showcaller tijdens de show.
-- Voer dit één keer uit in de Supabase SQL Editor van een BESTAAND project
-- (nieuwe projecten krijgen dit al via full_schema.sql). Idempotent.
--
-- Vervangt get_shared_rundowns door een versie met een extra 'chat'-key
-- (zelfde vorm als de bestaande 'notes'-key). Geen Realtime nodig — crew/
-- showcaller pollen deze functie toch al elke 3-5 seconden.

-- ========== RUNDOWN-CHAT ==========
-- Live chatkanaal tussen crew en showcaller tijdens de show. Zelfde opzet als
-- crew_notes (geen sessie voor crew/showcaller, dus schrijven via een
-- security definer-RPC, lezen via get_shared_rundowns). Projectbreed, niet
-- per podium — audio/showcaller moeten elkaar altijd kunnen bereiken.
-- Bewust geen Supabase Realtime: crew/showcaller draaien op de anon-key
-- zonder auth.uid(), dus RLS zou realtime-updates alsnog blokkeren. De
-- bestaande polling (get_shared_rundowns, elke 3-5s) is snel genoeg voor een
-- "duidelijk signaal dat er een nieuw bericht is".

create table if not exists public.rundown_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  sender text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists rundown_chat_messages_project_id_idx on public.rundown_chat_messages(project_id);

alter table public.rundown_chat_messages enable row level security;

drop policy if exists "owner full access on rundown_chat_messages" on public.rundown_chat_messages;
create policy "owner full access on rundown_chat_messages" on public.rundown_chat_messages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

create or replace function public.add_rundown_chat_message(
  p_token uuid,
  p_stage_id uuid,
  p_sender text,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_token;

  if v_project_id is null or coalesce(trim(p_message), '') = '' then
    return false;
  end if;

  insert into public.rundown_chat_messages (project_id, stage_id, sender, message)
  values (v_project_id, p_stage_id, coalesce(nullif(trim(p_sender), ''), 'Onbekend'), trim(p_message));

  return true;
end;
$$;

grant execute on function public.add_rundown_chat_message(uuid, uuid, text, text) to anon;

-- Update van get_shared_rundowns: geeft nu ook de rundown-chat mee, zelfde
-- opzet als de bestaande 'notes'-key hierboven.
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
