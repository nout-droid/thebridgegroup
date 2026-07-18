-- Rechten per project + Begroting aan/uit voor teamleden.
-- Voer dit één keer uit in de Supabase SQL Editor van een BESTAAND project
-- (nieuwe projecten krijgen dit al via full_schema.sql), NA migrations_team_accounts.sql.
-- Idempotent.
--
-- Na deze migratie ziet een teamlid GEEN enkel project meer totdat de eigenaar
-- (of een admin-lid) ze expliciet toegang geeft via team_member_project_access.
-- De eigenaar zelf heeft altijd volledige toegang. can_view_budget=false op een
-- team_members-rij verbergt daarnaast categories/quotes/quote_line_items/
-- material_list_items (de Begroting-tabellen) voor dat lid, op alle projecten
-- waar hij verder wel toegang toe heeft.

-- ========== TOEGANG PER PROJECT + BEGROTING AAN/UIT ==========
-- Een teamlid ziet standaard NIETS totdat de eigenaar (of een admin-lid) ze
-- expliciet toegang geeft tot een project. De eigenaar zelf heeft altijd
-- volledige toegang tot al zijn projecten, ongeacht deze tabel.

alter table public.team_members add column if not exists can_view_budget boolean not null default true;

create table if not exists public.team_member_project_access (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_member_id, project_id)
);

create index if not exists team_member_project_access_team_member_id_idx
  on public.team_member_project_access(team_member_id);
create index if not exists team_member_project_access_project_id_idx
  on public.team_member_project_access(project_id);

alter table public.team_member_project_access enable row level security;

drop policy if exists "team admins manage project access" on public.team_member_project_access;
create policy "team admins manage project access" on public.team_member_project_access
  for all using (
    exists (
      select 1 from public.team_members tm
      join public.projects p on p.id = project_id
      where tm.id = team_member_id and p.user_id = tm.owner_user_id and public.is_team_admin(tm.owner_user_id)
    )
  ) with check (
    exists (
      select 1 from public.team_members tm
      join public.projects p on p.id = project_id
      where tm.id = team_member_id and p.user_id = tm.owner_user_id and public.is_team_admin(tm.owner_user_id)
    )
  );

create or replace function public.has_project_access(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (
        p.user_id = auth.uid()
        or exists (
          select 1
          from public.team_members tm
          join public.team_member_project_access tmpa on tmpa.team_member_id = tm.id
          where tm.owner_user_id = p.user_id
            and tm.member_user_id = auth.uid()
            and tmpa.project_id = p.id
        )
      )
  );
$$;

create or replace function public.can_view_budget(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (
        p.user_id = auth.uid()
        or exists (
          select 1
          from public.team_members tm
          join public.team_member_project_access tmpa on tmpa.team_member_id = tm.id
          where tm.owner_user_id = p.user_id
            and tm.member_user_id = auth.uid()
            and tmpa.project_id = p.id
            and tm.can_view_budget
        )
      )
  );
$$;

-- Een teamlid die zelf een nieuw project aanmaakt, krijgt daar automatisch
-- toegang toe — anders zou hij zijn eigen net-aangemaakte project niet zien.
create or replace function public.grant_creator_project_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_member_project_access (team_member_id, project_id)
  select tm.id, new.id
  from public.team_members tm
  where tm.owner_user_id = new.user_id and tm.member_user_id = auth.uid()
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists grant_creator_project_access_trigger on public.projects;
create trigger grant_creator_project_access_trigger
after insert on public.projects
for each row execute function public.grant_creator_project_access();

drop policy if exists "team members can view/edit projects" on public.projects;
create policy "team members can view/edit projects" on public.projects
  for select using (public.has_project_access(id));

drop policy if exists "team members can insert projects" on public.projects;
create policy "team members can insert projects" on public.projects
  for insert with check (public.is_team_member(user_id));

drop policy if exists "team members can update projects" on public.projects;
create policy "team members can update projects" on public.projects
  for update using (public.has_project_access(id)) with check (public.has_project_access(id));

drop policy if exists "team admins can delete projects" on public.projects;
create policy "team admins can delete projects" on public.projects
  for delete using (public.is_team_admin(user_id) and public.has_project_access(id));

drop policy if exists "owner full access on categories" on public.categories;
create policy "owner full access on categories" on public.categories
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.can_view_budget(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.can_view_budget(p.id))
  );

drop policy if exists "owner full access on quotes" on public.quotes;
create policy "owner full access on quotes" on public.quotes
  for all using (
    exists (
      select 1 from public.categories c
      join public.projects p on p.id = c.project_id
      where c.id = category_id and public.can_view_budget(p.id)
    )
  ) with check (
    exists (
      select 1 from public.categories c
      join public.projects p on p.id = c.project_id
      where c.id = category_id and public.can_view_budget(p.id)
    )
  );

drop policy if exists "owner full access on material_list_items" on public.material_list_items;
create policy "owner full access on material_list_items" on public.material_list_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.can_view_budget(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.can_view_budget(p.id))
  );

drop policy if exists "owner full access on quote_line_items" on public.quote_line_items;
create policy "owner full access on quote_line_items" on public.quote_line_items
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.can_view_budget(p.id)
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.can_view_budget(p.id)
    )
  );

drop policy if exists "owner full access on stages" on public.stages;
create policy "owner full access on stages" on public.stages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner insert project-media" on storage.objects;
create policy "owner insert project-media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and public.has_project_access(p.id)
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
      and public.has_project_access(p.id)
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
      and public.has_project_access(p.id)
    )
  );

drop policy if exists "owner full access on project_media" on public.project_media;
create policy "owner full access on project_media" on public.project_media
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on quote_documents" on public.quote_documents;
create policy "owner full access on quote_documents" on public.quote_documents
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.has_project_access(p.id)
    )
  );

drop policy if exists "owner full access on guest_documents" on public.guest_documents;
create policy "owner full access on guest_documents" on public.guest_documents
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner access portal-documents" on storage.objects;
create policy "owner access portal-documents" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'portal-documents'
    and (
      exists (
        select 1 from public.quotes q
        join public.categories c on c.id = q.category_id
        join public.projects p on p.id = c.project_id
        where q.id::text = (storage.foldername(storage.objects.name))[2] and public.has_project_access(p.id)
      )
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(storage.objects.name))[2] and public.has_project_access(p.id)
      )
    )
  );

drop policy if exists "owner full access on riders" on public.riders;
create policy "owner full access on riders" on public.riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on rider_sections" on public.rider_sections;
create policy "owner full access on rider_sections" on public.rider_sections
  for all using (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and public.has_project_access(p.id)
    )
  );

drop policy if exists "owner full access on rider_section_items" on public.rider_section_items;
create policy "owner full access on rider_section_items" on public.rider_section_items
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

drop policy if exists "owner full access on schedule_items" on public.schedule_items;
create policy "owner full access on schedule_items" on public.schedule_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on crew_members" on public.crew_members;
create policy "owner full access on crew_members" on public.crew_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on equipment_reservations" on public.equipment_reservations;
create policy "owner full access on equipment_reservations" on public.equipment_reservations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on comms_assignments" on public.comms_assignments;
create policy "owner full access on comms_assignments" on public.comms_assignments
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on catering_orders" on public.catering_orders;
create policy "owner full access on catering_orders" on public.catering_orders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on artist_riders" on public.artist_riders;
create policy "owner full access on artist_riders" on public.artist_riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on open_questions" on public.open_questions;
create policy "owner full access on open_questions" on public.open_questions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on meeting_notes" on public.meeting_notes;
create policy "owner full access on meeting_notes" on public.meeting_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on power_requests" on public.power_requests;
create policy "owner full access on power_requests" on public.power_requests
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on rundowns" on public.rundowns;
create policy "owner full access on rundowns" on public.rundowns
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on rundown_items" on public.rundown_items;
create policy "owner full access on rundown_items" on public.rundown_items
  for all using (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and public.has_project_access(p.id)
    )
  );

drop policy if exists "owner full access on crew_notes" on public.crew_notes;
create policy "owner full access on crew_notes" on public.crew_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

drop policy if exists "owner full access on rundown_item_instructions" on public.rundown_item_instructions;
create policy "owner full access on rundown_item_instructions" on public.rundown_item_instructions
  for all using (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and public.has_project_access(p.id)
    )
  );

