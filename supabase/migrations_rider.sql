-- Festival rider: gestructureerd document, gedeeltelijk klant-bewerkbaar.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.rider_sections (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  title text not null,
  content text not null default '',
  editable_by_client boolean not null default false,
  sort_order int not null default 0,
  updated_by text not null default 'owner' check (updated_by in ('owner', 'client')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists rider_sections_rider_id_idx on public.rider_sections(rider_id);

alter table public.riders enable row level security;
alter table public.rider_sections enable row level security;

drop policy if exists "owner full access on riders" on public.riders;
create policy "owner full access on riders" on public.riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "owner full access on rider_sections" on public.rider_sections;
create policy "owner full access on rider_sections" on public.rider_sections
  for all using (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and p.user_id = auth.uid()
    )
  );

-- Houdt riders.version en updated_at automatisch bij zodra secties wijzigen
-- (zelfde patroon als de quote_line_items -> quotes.cost_price sync-trigger).

create or replace function public.bump_rider_version()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_rider_id uuid;
begin
  v_rider_id := coalesce(new.rider_id, old.rider_id);
  update public.riders
  set version = version + 1, updated_at = now()
  where id = v_rider_id;
  return null;
end;
$$;

drop trigger if exists rider_sections_bump_version on public.rider_sections;
create trigger rider_sections_bump_version
  after insert or update or delete on public.rider_sections
  for each row execute function public.bump_rider_version();

-- Klant mag alleen de inhoud van een sectie bijwerken die expliciet is vrijgegeven
-- (editable_by_client = true), en alleen binnen het project van zijn eigen share_token.

create or replace function public.update_rider_section_by_client(
  p_share_token uuid,
  p_section_id uuid,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.rider_sections rs
  set content = p_content, updated_by = 'client', updated_at = now()
  from public.riders r
  join public.projects p on p.id = r.project_id
  where rs.rider_id = r.id
    and rs.id = p_section_id
    and rs.editable_by_client = true
    and p.share_token = p_share_token;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.update_rider_section_by_client(uuid, uuid, text) to anon;

-- Rider + secties voor de klantweergave (los van get_shared_project, blijft zo overzichtelijk).

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
          'editable_by_client', rs.editable_by_client
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
