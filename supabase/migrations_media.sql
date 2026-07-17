-- Klantpagina-content: achtergrond + media (foto's/video-links) per project.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

-- Paden in deze bucket volgen de conventie: projects/{project_id}/... zodat de RLS-policy
-- hieronder kan controleren of het project van de ingelogde gebruiker is.

drop policy if exists "owner insert project-media" on storage.objects;
create policy "owner insert project-media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
    )
  );

drop policy if exists "owner update project-media" on storage.objects;
create policy "owner update project-media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
    )
  );

drop policy if exists "owner delete project-media" on storage.objects;
create policy "owner delete project-media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and p.user_id = auth.uid()
    )
  );

alter table public.projects add column if not exists background_image_url text;

create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('photo', 'video_link')),
  url text not null,
  caption text default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_media_project_id_idx on public.project_media(project_id);

alter table public.project_media enable row level security;

drop policy if exists "owner full access on project_media" on public.project_media;
create policy "owner full access on project_media" on public.project_media
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
