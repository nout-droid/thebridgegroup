-- Activiteiten-log: meldingen op het projectdashboard zodra een klant of leverancier
-- iets aanpast. Voer dit één keer uit in de Supabase SQL Editor.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_type text not null check (actor_type in ('client', 'supplier')),
  actor_label text not null,
  category text not null,
  description text not null,
  acknowledged_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_project_id_idx on public.activity_log(project_id);

alter table public.activity_log enable row level security;

drop policy if exists "owner full access on activity_log" on public.activity_log;
create policy "owner full access on activity_log" on public.activity_log
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- Klant-schrijfacties krijgen er een extra logregel bij (project_id is al bekend via het
-- share_token-lookup binnen deze functies zelf).

create or replace function public.update_rider_section_by_client(
  p_share_token uuid,
  p_section_id uuid,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_project_id uuid;
  v_title text;
begin
  update public.rider_sections rs
  set content = p_content, updated_by = 'client', updated_at = now()
  from public.riders r
  join public.projects p on p.id = r.project_id
  where rs.rider_id = r.id
    and rs.id = p_section_id
    and rs.editable_by_client = true
    and p.share_token = p_share_token;

  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    select r.project_id, rs.title into v_project_id, v_title
    from public.rider_sections rs
    join public.riders r on r.id = rs.rider_id
    where rs.id = p_section_id;

    insert into public.activity_log (project_id, actor_type, actor_label, category, description)
    values (v_project_id, 'client', 'Klant', 'rider', 'Rider bijgewerkt: ' || coalesce(v_title, ''));
  end if;

  return v_updated > 0;
end;
$$;

grant execute on function public.update_rider_section_by_client(uuid, uuid, text) to anon;

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

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'checklist', 'Checklist ingevuld: ' || p_section_key);

  return true;
end;
$$;

grant execute on function public.upsert_intake_checklist_answer_by_client(uuid, text, text) to anon;
