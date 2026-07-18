-- Team-accounts: teamleden met rechten (member/admin) naast de eigenaar.
-- Voer dit één keer uit in de Supabase SQL Editor van een BESTAAND project
-- (nieuwe projecten krijgen dit al via full_schema.sql). Idempotent: gebruikt
-- overal "if not exists" / "drop policy if exists" + "create or replace", dus
-- opnieuw draaien is veilig.
--
-- Na deze migratie:
-- - role='member' (default): mag alles bekijken/aanmaken/bewerken dat de
--   eigenaar ook kan, BEHALVE projecten/leveranciers/article_aliases
--   verwijderen en teambeheer.
-- - role='admin': mag daarnaast ook verwijderen en teamleden
--   uitnodigen/wijzigen/verwijderen.
-- - De eigenaar zelf (auth.uid() = owner_user_id) heeft altijd volledige
--   toegang, ongeacht team_members-rijen.

-- ========== TEAM ACCOUNTS ==========
-- Een eigenaar (producent) kan teamleden uitnodigen die met dezelfde data werken
-- als hijzelf. role='admin' mag daarnaast teambeheer doen en verwijderen
-- (projecten/leveranciers); role='member' mag alles bekijken/bewerken behalve
-- verwijderen en teambeheer.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_email text not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, member_user_id)
);

create index if not exists team_members_owner_user_id_idx on public.team_members(owner_user_id);
create index if not exists team_members_member_user_id_idx on public.team_members(member_user_id);

alter table public.team_members enable row level security;

-- security definer zodat de policies hieronder (die deze functies aanroepen) geen
-- recursieve RLS-lookup op team_members zelf hoeven te doen.
create or replace function public.is_team_member(p_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() = p_owner_id
    or exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = p_owner_id and tm.member_user_id = auth.uid()
    );
$$;

create or replace function public.is_team_admin(p_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() = p_owner_id
    or exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = p_owner_id and tm.member_user_id = auth.uid() and tm.role = 'admin'
    );
$$;

drop policy if exists "team members can view their team" on public.team_members;
create policy "team members can view their team" on public.team_members
  for select using (public.is_team_member(owner_user_id));

drop policy if exists "team admins can invite team members" on public.team_members;
create policy "team admins can invite team members" on public.team_members
  for insert with check (public.is_team_admin(owner_user_id));

drop policy if exists "team admins can update team members" on public.team_members;
create policy "team admins can update team members" on public.team_members
  for update using (public.is_team_admin(owner_user_id)) with check (public.is_team_admin(owner_user_id));

drop policy if exists "team admins can remove team members" on public.team_members;
create policy "team admins can remove team members" on public.team_members
  for delete using (public.is_team_admin(owner_user_id));

-- de oude, ongesplitste "for all"-policy's vervangen door de member/admin-split hieronder.
drop policy if exists "owner full access on projects" on public.projects;
drop policy if exists "team members can view/edit projects" on public.projects;
create policy "team members can view/edit projects" on public.projects
  for select using (public.is_team_member(user_id));

drop policy if exists "team members can insert projects" on public.projects;
create policy "team members can insert projects" on public.projects
  for insert with check (public.is_team_member(user_id));

drop policy if exists "team members can update projects" on public.projects;
create policy "team members can update projects" on public.projects
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));

drop policy if exists "team admins can delete projects" on public.projects;
create policy "team admins can delete projects" on public.projects
  for delete using (public.is_team_admin(user_id));

drop policy if exists "owner full access on suppliers" on public.suppliers;
drop policy if exists "team members can view/edit suppliers" on public.suppliers;
create policy "team members can view/edit suppliers" on public.suppliers
  for select using (public.is_team_member(user_id));

drop policy if exists "team members can insert suppliers" on public.suppliers;
create policy "team members can insert suppliers" on public.suppliers
  for insert with check (public.is_team_member(user_id));

drop policy if exists "team members can update suppliers" on public.suppliers;
create policy "team members can update suppliers" on public.suppliers
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));

drop policy if exists "team admins can delete suppliers" on public.suppliers;
create policy "team admins can delete suppliers" on public.suppliers
  for delete using (public.is_team_admin(user_id));

drop policy if exists "owner full access on categories" on public.categories;
create policy "owner full access on categories" on public.categories
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on quotes" on public.quotes;
create policy "owner full access on quotes" on public.quotes
  for all using (
    exists (
      select 1 from public.categories c
      join public.projects p on p.id = c.project_id
      where c.id = category_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1 from public.categories c
      join public.projects p on p.id = c.project_id
      where c.id = category_id and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on catalog_articles" on public.catalog_articles;
create policy "owner full access on catalog_articles" on public.catalog_articles
  for all using (
    exists (select 1 from public.suppliers s where s.id = supplier_id and public.is_team_member(s.user_id))
  ) with check (
    exists (select 1 from public.suppliers s where s.id = supplier_id and public.is_team_member(s.user_id))
  );

drop policy if exists "owner full access on material_list_items" on public.material_list_items;
create policy "owner full access on material_list_items" on public.material_list_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on quote_line_items" on public.quote_line_items;
create policy "owner full access on quote_line_items" on public.quote_line_items
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on stages" on public.stages;
create policy "owner full access on stages" on public.stages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on article_aliases" on public.article_aliases;
drop policy if exists "team members can view/edit article_aliases" on public.article_aliases;
create policy "team members can view/edit article_aliases" on public.article_aliases
  for select using (public.is_team_member(user_id));

drop policy if exists "team members can insert article_aliases" on public.article_aliases;
create policy "team members can insert article_aliases" on public.article_aliases
  for insert with check (public.is_team_member(user_id));

drop policy if exists "team members can update article_aliases" on public.article_aliases;
create policy "team members can update article_aliases" on public.article_aliases
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));

drop policy if exists "team admins can delete article_aliases" on public.article_aliases;
create policy "team admins can delete article_aliases" on public.article_aliases
  for delete using (public.is_team_admin(user_id));

drop policy if exists "owner insert project-media" on storage.objects;
create policy "owner insert project-media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[2]
      and public.is_team_member(p.user_id)
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
      and public.is_team_member(p.user_id)
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
      and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on project_media" on public.project_media;
create policy "owner full access on project_media" on public.project_media
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on quote_documents" on public.quote_documents;
create policy "owner full access on quote_documents" on public.quote_documents
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on guest_documents" on public.guest_documents;
create policy "owner full access on guest_documents" on public.guest_documents
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
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
        where q.id::text = (storage.foldername(storage.objects.name))[2] and public.is_team_member(p.user_id)
      )
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(storage.objects.name))[2] and public.is_team_member(p.user_id)
      )
    )
  );

drop policy if exists "owner full access on riders" on public.riders;
create policy "owner full access on riders" on public.riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on rider_sections" on public.rider_sections;
create policy "owner full access on rider_sections" on public.rider_sections
  for all using (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1 from public.riders r
      join public.projects p on p.id = r.project_id
      where r.id = rider_id and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on rider_section_items" on public.rider_section_items;
create policy "owner full access on rider_section_items" on public.rider_section_items
  for all using (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1 from public.rider_sections rs
      join public.riders r on r.id = rs.rider_id
      join public.projects p on p.id = r.project_id
      where rs.id = section_id and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on schedule_items" on public.schedule_items;
create policy "owner full access on schedule_items" on public.schedule_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on crew_members" on public.crew_members;
create policy "owner full access on crew_members" on public.crew_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on equipment_reservations" on public.equipment_reservations;
create policy "owner full access on equipment_reservations" on public.equipment_reservations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on comms_assignments" on public.comms_assignments;
create policy "owner full access on comms_assignments" on public.comms_assignments
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on catering_orders" on public.catering_orders;
create policy "owner full access on catering_orders" on public.catering_orders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on artist_riders" on public.artist_riders;
create policy "owner full access on artist_riders" on public.artist_riders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on open_questions" on public.open_questions;
create policy "owner full access on open_questions" on public.open_questions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on meeting_notes" on public.meeting_notes;
create policy "owner full access on meeting_notes" on public.meeting_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on power_requests" on public.power_requests;
create policy "owner full access on power_requests" on public.power_requests
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on rundowns" on public.rundowns;
create policy "owner full access on rundowns" on public.rundowns
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on rundown_items" on public.rundown_items;
create policy "owner full access on rundown_items" on public.rundown_items
  for all using (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1 from public.rundowns r
      join public.projects p on p.id = r.project_id
      where r.id = rundown_id and public.is_team_member(p.user_id)
    )
  );

drop policy if exists "owner full access on crew_notes" on public.crew_notes;
create policy "owner full access on crew_notes" on public.crew_notes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_team_member(p.user_id))
  );

drop policy if exists "owner full access on rundown_item_instructions" on public.rundown_item_instructions;
create policy "owner full access on rundown_item_instructions" on public.rundown_item_instructions
  for all using (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and public.is_team_member(p.user_id)
    )
  ) with check (
    exists (
      select 1
      from public.rundown_items ri
      join public.rundowns r on r.id = ri.rundown_id
      join public.projects p on p.id = r.project_id
      where ri.id = item_id and public.is_team_member(p.user_id)
    )
  );

