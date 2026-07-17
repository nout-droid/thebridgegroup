-- Stages/podia als aparte pagina's binnen een project
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stages_project_id_idx on public.stages(project_id);

alter table public.stages enable row level security;

drop policy if exists "owner full access on stages" on public.stages;
create policy "owner full access on stages" on public.stages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- null = projectbrede categorie (bv. Transport, Crew, Hotel), anders hoort de categorie bij die stage.
alter table public.categories add column if not exists stage_id uuid references public.stages(id) on delete cascade;

create index if not exists categories_stage_id_idx on public.categories(stage_id);
