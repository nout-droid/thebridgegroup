-- Foto's per sectie van de aanvraag checklist. Klant en eigenaar kunnen beiden uploaden
-- en verwijderen. Gebruikt de bestaande private 'portal-documents'-bucket (zie
-- full_schema.sql, sectie PRIVATE STORAGE BUCKET) — geen bucket-policy-wijziging nodig,
-- want het pad "intake/{project_id}/{section_key}/..." voldoet al aan de bestaande
-- eigenaar-policy (die (storage.foldername(name))[2] tegen projects.id checkt).
-- Voer dit één keer uit in de Supabase SQL Editor, ná migrations_intake_checklist.sql.

create table if not exists public.intake_checklist_photos (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.intake_checklists(id) on delete cascade,
  section_key text not null,
  storage_path text not null,
  original_filename text not null default '',
  uploaded_by text not null default 'client' check (uploaded_by in ('owner', 'client')),
  created_at timestamptz not null default now()
);

create index if not exists intake_checklist_photos_checklist_id_idx
  on public.intake_checklist_photos(checklist_id);

alter table public.intake_checklist_photos enable row level security;

drop policy if exists "owner full access on intake_checklist_photos" on public.intake_checklist_photos;
create policy "owner full access on intake_checklist_photos" on public.intake_checklist_photos
  for all using (
    exists (
      select 1 from public.intake_checklists ic
      join public.projects p on p.id = ic.project_id
      where ic.id = checklist_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.intake_checklists ic
      join public.projects p on p.id = ic.project_id
      where ic.id = checklist_id and public.has_project_access(p.id)
    )
  );

-- get_shared_intake_checklist: nu ook de geuploade foto's meegeven aan de klantweergave
-- (bewust geen storage_path — die blijft server-only, de klant downloadt via een aparte
-- getekende-URL-route die het pad zelf niet blootgeeft).
create or replace function public.get_shared_intake_checklist(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'updated_at', ic.updated_at,
    'answers', coalesce((
      select json_agg(json_build_object(
        'section_key', a.section_key, 'content', a.content, 'updated_by', a.updated_by
      ))
      from public.intake_checklist_answers a
      where a.checklist_id = ic.id
    ), '[]'::json),
    'photos', coalesce((
      select json_agg(json_build_object(
        'id', ph.id, 'section_key', ph.section_key,
        'original_filename', ph.original_filename, 'uploaded_by', ph.uploaded_by,
        'created_at', ph.created_at
      ) order by ph.created_at)
      from public.intake_checklist_photos ph
      where ph.checklist_id = ic.id
    ), '[]'::json)
  )
  from public.projects p
  left join public.intake_checklists ic on ic.project_id = p.id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_intake_checklist(uuid) to anon;
