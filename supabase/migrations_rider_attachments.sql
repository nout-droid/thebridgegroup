-- Bijlagen per rider-onderdeel (bv. technische tekeningen, plattegronden, spec-sheets) —
-- zelfde patroon als intake_checklist_photos: geen versiebump op riders.version (bijlagen
-- horen niet bij de inhoud van een onderdeel), storage-pad rider/{project_id}/{section_id}/...
-- voldoet aan de bestaande "owner access portal-documents" storage-policy (die alleen
-- foldername(name)[2] = project_id checkt), dus geen wijziging aan die policy nodig.

create table if not exists public.rider_section_attachments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.rider_sections(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  uploaded_by text not null default 'owner' check (uploaded_by in ('owner', 'client')),
  created_at timestamptz not null default now()
);

create index if not exists rider_section_attachments_section_id_idx on public.rider_section_attachments(section_id);

alter table public.rider_section_attachments enable row level security;

drop policy if exists "owner full access on rider_section_attachments" on public.rider_section_attachments;
create policy "owner full access on rider_section_attachments" on public.rider_section_attachments
  for all using (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and public.has_project_access(p.id)
    )
  );

grant select, insert, update, delete on public.rider_section_attachments to authenticated;

-- get_shared_rider: nu ook de bijlagen per onderdeel meegeven (nooit storage_path, om het
-- private bucket-pad niet aan anon te lekken — zelfde principe als get_shared_intake_checklist).
create or replace function public.get_shared_rider(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'version', r.version,
    'updated_at', r.updated_at,
    'sections', coalesce((
      select json_agg(
        json_build_object(
          'id', rs.id,
          'title', rs.title,
          'content', rs.content,
          'editable_by_client', rs.editable_by_client,
          'stage_id', rs.stage_id,
          'stage_name', s.name,
          'items', coalesce((
            select json_agg(
              json_build_object('id', rsi.id, 'description', rsi.description)
              order by rsi.sort_order
            )
            from public.rider_section_items rsi
            where rsi.section_id = rs.id
          ), '[]'::json),
          'attachments', coalesce((
            select json_agg(
              json_build_object(
                'id', rsa.id,
                'original_filename', rsa.original_filename,
                'uploaded_by', rsa.uploaded_by
              )
              order by rsa.created_at
            )
            from public.rider_section_attachments rsa
            where rsa.section_id = rs.id
          ), '[]'::json)
        ) order by rs.sort_order
      )
      from public.rider_sections rs
      left join public.stages s on s.id = rs.stage_id
      where rs.rider_id = r.id
    ), '[]'::json)
  )
  from public.riders r
  join public.projects p on p.id = r.project_id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_rider(uuid) to anon;
