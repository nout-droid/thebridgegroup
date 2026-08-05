-- Standaard to-do lijst per project: een organisatiebrede standaardsjabloon (eenmalig
-- geseed, daarna vrij aan te passen — zelfde patroon als team_roles) die bij het eerste
-- bezoek van een project wordt gekopieerd naar losse, per-project taken. Een taak afvinken
-- verplaatst 'm in de UI naar een ingeklapte "voltooid"-sectie, zodat de zichtbare lijst
-- vanzelf korter wordt naarmate je vordert. Het huidige takenlijstje van een project kan
-- als nieuwe standaard worden opgeslagen (overschrijft de organisatiesjabloon).

create table if not exists public.todo_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists todo_templates_owner_user_id_idx on public.todo_templates(owner_user_id);

alter table public.todo_templates enable row level security;

drop policy if exists "team members can view todo_templates" on public.todo_templates;
create policy "team members can view todo_templates" on public.todo_templates
  for select using (public.is_team_member(owner_user_id));
drop policy if exists "team members can insert todo_templates" on public.todo_templates;
create policy "team members can insert todo_templates" on public.todo_templates
  for insert with check (public.is_team_member(owner_user_id));
drop policy if exists "team members can update todo_templates" on public.todo_templates;
create policy "team members can update todo_templates" on public.todo_templates
  for update using (public.is_team_member(owner_user_id)) with check (public.is_team_member(owner_user_id));
drop policy if exists "team members can delete todo_templates" on public.todo_templates;
create policy "team members can delete todo_templates" on public.todo_templates
  for delete using (public.is_team_member(owner_user_id));

grant select, insert, update, delete on public.todo_templates to authenticated;

create table if not exists public.project_todos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_todos_project_id_idx on public.project_todos(project_id);

alter table public.project_todos enable row level security;

drop policy if exists "owner full access on project_todos" on public.project_todos;
create policy "owner full access on project_todos" on public.project_todos
  for all using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));

grant select, insert, update, delete on public.project_todos to authenticated;
