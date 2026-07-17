-- Draaiboek: tijdlijn van activiteiten, projectbreed of per stage (zelfde patroon als
-- categories.stage_id) — volledig gescheiden weergaves, geen samengevoegd overzicht.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  activity_date date not null,
  activity_time time not null,
  activity text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  priority text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists schedule_items_project_id_idx on public.schedule_items(project_id);
create index if not exists schedule_items_stage_id_idx on public.schedule_items(stage_id);

alter table public.schedule_items enable row level security;

drop policy if exists "owner full access on schedule_items" on public.schedule_items;
create policy "owner full access on schedule_items" on public.schedule_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
