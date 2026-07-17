-- Crew-portal (live meekijken + notes per devisie) en showcaller-portal
-- (live show bedienen + rundown editen), zelfde login/cookie-patroon als
-- klant/gast/leverancier. Voer dit één keer uit in de Supabase SQL Editor,
-- ná de eerdere migraties (inclusief migrations_rundown.sql).

-- ========== CREW PORTAAL-LOGIN ==========

alter table public.projects add column if not exists crew_password_hash text;

create or replace function public.verify_crew_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and crew_password_hash is not null
    and crew_password_hash = crypt(p_password, crew_password_hash)
  limit 1;
$$;

grant execute on function public.verify_crew_login(text, text) to anon;

create or replace function public.set_crew_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set crew_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_crew_password(uuid, text) to authenticated;

-- ========== SHOWCALLER PORTAAL-LOGIN ==========

alter table public.projects add column if not exists showcaller_password_hash text;

create or replace function public.verify_showcaller_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and showcaller_password_hash is not null
    and showcaller_password_hash = crypt(p_password, showcaller_password_hash)
  limit 1;
$$;

grant execute on function public.verify_showcaller_login(text, text) to anon;

create or replace function public.set_showcaller_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set showcaller_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_showcaller_password(uuid, text) to authenticated;

-- ========== NOTES PER DEVISIE ==========

create table if not exists public.crew_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  division text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists crew_notes_project_id_idx on public.crew_notes(project_id);

alter table public.crew_notes enable row level security;

drop policy if exists "owner full access on crew_notes" on public.crew_notes;
create policy "owner full access on crew_notes" on public.crew_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Crew heeft geen Supabase-sessie (eigen cookie-login), dus notes toevoegen
-- loopt via onderstaande security-definer RPC, niet via een RLS-policy.

create or replace function public.add_crew_note(
  p_token uuid,
  p_stage_id uuid,
  p_division text,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from public.projects
  where share_token = p_token and crew_password_hash is not null;

  if v_project_id is null or coalesce(trim(p_note), '') = '' then
    return false;
  end if;

  insert into public.crew_notes (project_id, stage_id, division, note)
  values (v_project_id, p_stage_id, coalesce(nullif(trim(p_division), ''), 'Overig'), trim(p_note));

  return true;
end;
$$;

grant execute on function public.add_crew_note(uuid, uuid, text, text) to anon;

-- ========== GEDEELDE LEESFUNCTIE: RUNDOWNS + ITEMS + NOTES ==========
-- Gebruikt door zowel de crew- als de showcaller-portal om (via polling)
-- live mee te kijken zonder een Supabase-sessie. Geeft per scope (projectbreed
-- + elke stage) de rundown-header en cue-lijst terug, plus de laatste notes.

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
            'current_item_started_at', r.current_item_started_at
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
            'divisions', ri.divisions,
            'notes', ri.notes,
            'color', ri.color,
            'sort_order', ri.sort_order
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
