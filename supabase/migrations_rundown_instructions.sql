-- Elke cue kan meerdere concrete opdrachten per devisie hebben (bv. "Audio —
-- HH 1 open zetten"), dus de losse divisions-tags worden vervangen door een
-- lijst met devisie + opdracht-regels. Voer dit één keer uit in de Supabase
-- SQL Editor, ná migrations_rundown_divisions.sql.

create table if not exists public.rundown_item_instructions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.rundown_items(id) on delete cascade,
  division text not null default '',
  instruction text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rundown_item_instructions_item_id_idx on public.rundown_item_instructions(item_id);

alter table public.rundown_item_instructions enable row level security;

drop policy if exists "owner full access on rundown_item_instructions" on public.rundown_item_instructions;
create policy "owner full access on rundown_item_instructions" on public.rundown_item_instructions
  for all using (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and p.user_id = auth.uid()
    )
  );

alter table public.rundown_items drop column if exists divisions;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rundown_item_instructions'
  ) then
    alter publication supabase_realtime add table public.rundown_item_instructions;
  end if;
end $$;
