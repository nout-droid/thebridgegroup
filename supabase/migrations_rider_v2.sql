-- Losse regels binnen een rider-onderdeel (bv. extra lampen/speakers toevoegen aan "Techniek").
-- Voer dit één keer uit in de Supabase SQL Editor, ná migrations_rider.sql.

create table if not exists public.rider_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.rider_sections(id) on delete cascade,
  description text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rider_section_items_section_id_idx on public.rider_section_items(section_id);

alter table public.rider_section_items enable row level security;

drop policy if exists "owner full access on rider_section_items" on public.rider_section_items;
create policy "owner full access on rider_section_items" on public.rider_section_items
  for all using (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and p.user_id = auth.uid()
    )
  );

-- Zelfde versiebump als rider_sections, maar dan via section_id -> rider_id.

create or replace function public.bump_rider_version_from_item()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_section_id uuid;
  v_rider_id uuid;
begin
  v_section_id := coalesce(new.section_id, old.section_id);
  select rider_id into v_rider_id from public.rider_sections where id = v_section_id;
  if v_rider_id is not null then
    update public.riders
    set version = version + 1, updated_at = now()
    where id = v_rider_id;
  end if;
  return null;
end;
$$;

drop trigger if exists rider_section_items_bump_version on public.rider_section_items;
create trigger rider_section_items_bump_version
  after insert or update or delete on public.rider_section_items
  for each row execute function public.bump_rider_version_from_item();

-- get_shared_rider: nu ook de regels per onderdeel meegeven aan de klantweergave/PDF.

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
          'items', coalesce((
            select json_agg(
              json_build_object('id', rsi.id, 'description', rsi.description)
              order by rsi.sort_order
            )
            from public.rider_section_items rsi
            where rsi.section_id = rs.id
          ), '[]'::json)
        ) order by rs.sort_order
      )
      from public.rider_sections rs
      where rs.rider_id = r.id
    ), '[]'::json)
  )
  from public.riders r
  join public.projects p on p.id = r.project_id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_rider(uuid) to anon;
