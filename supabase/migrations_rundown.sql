-- Show rundown: cue-by-cue uitvoering van de show zelf, met automatisch
-- doorschuivende tijden en live tracking die real-time meesynct via Supabase
-- Realtime. Zelfde stage_id-nullable patroon als categories/schedule_items.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.rundowns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  start_time time not null default '19:00',
  is_live boolean not null default false,
  current_item_id uuid,
  current_item_started_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists rundowns_project_stage_unique
  on public.rundowns(project_id, coalesce(stage_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.rundowns enable row level security;

drop policy if exists "owner full access on rundowns" on public.rundowns;
create policy "owner full access on rundowns" on public.rundowns
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create table if not exists public.rundown_items (
  id uuid primary key default gen_random_uuid(),
  rundown_id uuid not null references public.rundowns(id) on delete cascade,
  cue_number text not null default '',
  name text not null default '',
  duration_seconds int not null default 60,
  responsible text not null default '',
  notes text not null default '',
  color text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rundown_items_rundown_id_idx on public.rundown_items(rundown_id);

alter table public.rundown_items enable row level security;

drop policy if exists "owner full access on rundown_items" on public.rundown_items;
create policy "owner full access on rundown_items" on public.rundown_items
  for all using (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and p.user_id = auth.uid()
    )
  );

-- Realtime aanzetten voor beide tabellen, idempotent (voorkomt een fout als
-- de tabel al in de publicatie zit wanneer dit script opnieuw wordt gedraaid).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rundowns'
  ) then
    alter publication supabase_realtime add table public.rundowns;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rundown_items'
  ) then
    alter publication supabase_realtime add table public.rundown_items;
  end if;
end $$;
