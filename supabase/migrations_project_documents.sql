-- Documentenpagina: losse bestanden (bv. tekeningen) die nergens anders bij horen.
-- Gebruikt de bestaande private 'portal-documents'-bucket. Voer dit één keer uit
-- in de Supabase SQL Editor.

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  storage_path text not null,
  original_filename text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx on public.project_documents(project_id);

alter table public.project_documents enable row level security;

drop policy if exists "owner full access on project_documents" on public.project_documents;
create policy "owner full access on project_documents" on public.project_documents
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );
