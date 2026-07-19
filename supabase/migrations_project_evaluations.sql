-- Evaluatiepagina: één vrij tekstvak per project, intern/eigenaar-only. Voer dit één
-- keer uit in de Supabase SQL Editor.

create table if not exists public.project_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.project_evaluations enable row level security;

drop policy if exists "owner full access on project_evaluations" on public.project_evaluations;
create policy "owner full access on project_evaluations" on public.project_evaluations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );
