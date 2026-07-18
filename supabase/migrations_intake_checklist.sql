-- Aanvraag checklist in het klantportaal: vaste 9-secties-intake die de klant zelf kan
-- invullen (NL of EN, wisselen via de bestaande taal-toggle). Titels en hulptekst per
-- sectie staan statisch in de app (src/lib/intake-checklist-sections.ts) — hier komen
-- alleen de ingevulde antwoorden te staan. Voer dit één keer uit in de Supabase SQL Editor.

create table if not exists public.intake_checklists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.intake_checklist_answers (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.intake_checklists(id) on delete cascade,
  section_key text not null,
  content text not null default '',
  updated_by text not null default 'owner' check (updated_by in ('owner', 'client')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (checklist_id, section_key)
);

create index if not exists intake_checklist_answers_checklist_id_idx
  on public.intake_checklist_answers(checklist_id);

alter table public.intake_checklists enable row level security;
alter table public.intake_checklist_answers enable row level security;

drop policy if exists "owner full access on intake_checklists" on public.intake_checklists;
create policy "owner full access on intake_checklists" on public.intake_checklists
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on intake_checklist_answers" on public.intake_checklist_answers;
create policy "owner full access on intake_checklist_answers" on public.intake_checklist_answers
  for all using (
    exists (
      select 1 from public.intake_checklists ic
      join public.projects p on p.id = ic.project_id
      where ic.id = checklist_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.intake_checklists ic
      join public.projects p on p.id = ic.project_id
      where ic.id = checklist_id and public.has_project_access(p.id)
    )
  );

-- Leest alle ingevulde antwoorden voor de klantweergave. LEFT JOIN zodat de tab ook werkt
-- als er nog geen intake_checklists-rij bestaat (klant kan meteen invullen, ook als de
-- eigenaar de checklist-pagina zelf nog nooit heeft geopend).
create or replace function public.get_shared_intake_checklist(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'updated_at', ic.updated_at,
    'answers', coalesce((
      select json_agg(json_build_object(
        'section_key', a.section_key, 'content', a.content, 'updated_by', a.updated_by
      ))
      from public.intake_checklist_answers a
      where a.checklist_id = ic.id
    ), '[]'::json)
  )
  from public.projects p
  left join public.intake_checklists ic on ic.project_id = p.id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_intake_checklist(uuid) to anon;

-- Upsert vanaf de klant: maakt de intake_checklists-rij lazily aan als die nog niet bestaat.
create or replace function public.upsert_intake_checklist_answer_by_client(
  p_share_token uuid,
  p_section_key text,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_checklist_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_share_token;
  if v_project_id is null then
    return false;
  end if;

  insert into public.intake_checklists (project_id)
  values (v_project_id)
  on conflict (project_id) do nothing;

  select id into v_checklist_id from public.intake_checklists where project_id = v_project_id;

  insert into public.intake_checklist_answers (checklist_id, section_key, content, updated_by)
  values (v_checklist_id, p_section_key, p_content, 'client')
  on conflict (checklist_id, section_key)
  do update set content = excluded.content, updated_by = 'client', updated_at = now();

  update public.intake_checklists set updated_at = now() where id = v_checklist_id;
  return true;
end;
$$;

grant execute on function public.upsert_intake_checklist_answer_by_client(uuid, text, text) to anon;
