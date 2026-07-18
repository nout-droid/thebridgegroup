-- Stroomaanvragen per stage, inclusief gewenste positie. Leveranciers kunnen dit
-- straks zelf aanvragen via het leveranciersportaal (zie /supplier-portal/[supplierId]/aanvragen).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.power_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text not null default '',
  quantity int not null default 1,
  position text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists power_requests_project_id_idx on public.power_requests(project_id);
create index if not exists power_requests_stage_id_idx on public.power_requests(stage_id);
create index if not exists power_requests_supplier_id_idx on public.power_requests(supplier_id);

alter table public.power_requests enable row level security;

drop policy if exists "owner full access on power_requests" on public.power_requests;
create policy "owner full access on power_requests" on public.power_requests
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
