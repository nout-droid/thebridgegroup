-- Storybook: gecureerde sfeer/concept-hoofdstukken per project, met moodboard-afbeeldingen,
-- zichtbaar en per hoofdstuk goed te keuren door de klant. Voer dit één keer uit in de
-- Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.storybook_chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order int not null default 0,
  client_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists storybook_chapters_project_id_idx on public.storybook_chapters(project_id);

alter table public.storybook_chapters enable row level security;

drop policy if exists "project access on storybook_chapters" on public.storybook_chapters;
create policy "project access on storybook_chapters" on public.storybook_chapters
  for all using (
    public.has_project_access(project_id)
  ) with check (
    public.has_project_access(project_id)
  );

grant select, insert, update, delete on public.storybook_chapters to authenticated;

create table if not exists public.storybook_images (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.storybook_chapters(id) on delete cascade,
  url text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists storybook_images_chapter_id_idx on public.storybook_images(chapter_id);

alter table public.storybook_images enable row level security;

drop policy if exists "project access on storybook_images" on public.storybook_images;
create policy "project access on storybook_images" on public.storybook_images
  for all using (
    exists (
      select 1 from public.storybook_chapters sc
      where sc.id = chapter_id and public.has_project_access(sc.project_id)
    )
  ) with check (
    exists (
      select 1 from public.storybook_chapters sc
      where sc.id = chapter_id and public.has_project_access(sc.project_id)
    )
  );

grant select, insert, update, delete on public.storybook_images to authenticated;

-- Klant-portaal: read-only ophalen van storybook-hoofdstukken + afbeeldingen via share token.
create or replace function public.get_shared_storybook(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'id', sc.id,
      'title', sc.title,
      'description', sc.description,
      'client_approved_at', sc.client_approved_at,
      'images', coalesce((
        select json_agg(json_build_object('id', si.id, 'url', si.url, 'caption', si.caption) order by si.sort_order)
        from public.storybook_images si where si.chapter_id = sc.id
      ), '[]'::json)
    ) order by sc.sort_order
  ), '[]'::json)
  from public.storybook_chapters sc
  join public.projects p on p.id = sc.project_id
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_storybook(uuid) to anon;

-- Klant keurt (of trekt goedkeuring in van) een los storybook-hoofdstuk.
create or replace function public.respond_to_storybook_chapter_by_client(
  p_share_token uuid,
  p_chapter_id uuid,
  p_approved boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_title text;
begin
  select sc.project_id, sc.title into v_project_id, v_title
  from public.storybook_chapters sc
  join public.projects p on p.id = sc.project_id
  where sc.id = p_chapter_id and p.share_token = p_share_token;

  if v_project_id is null then
    return false;
  end if;

  update public.storybook_chapters
  set client_approved_at = case when p_approved then now() else null end,
      updated_at = now()
  where id = p_chapter_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (
    v_project_id, 'client', 'Klant', 'storybook',
    case when p_approved then 'Storybook-hoofdstuk goedgekeurd: ' || v_title
         else 'Goedkeuring ingetrokken: ' || v_title end
  );

  return true;
end;
$$;

grant execute on function public.respond_to_storybook_chapter_by_client(uuid, uuid, boolean) to anon;
