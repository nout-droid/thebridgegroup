-- Uitbreidbare rollen: naam + rechtenprofiel, per organisatie zelf aan te maken/aan te
-- passen. Bepaalt WAT een teamlid ziet: alle projecten of alleen expliciet toegewezen
-- projecten (team_member_project_access blijft bestaan voor de laatste), wel/geen begroting,
-- en welke navigatie-onderdelen in beeld komen. "can_edit" is vooralsnog UI-niveau (verbergt
-- bewerkformulieren) — geen RLS-schrijfblokkade per rol; dat is een grotere vervolgstap.
create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  all_projects boolean not null default false,
  can_view_budget boolean not null default true,
  can_edit boolean not null default true,
  nav_sections text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_user_id, name)
);

create index if not exists team_roles_owner_user_id_idx on public.team_roles(owner_user_id);

alter table public.team_roles enable row level security;

-- Elk teamlid mag de rollen van zijn eigen team LEZEN (nodig om zijn eigen nav_sections op
-- te zoeken, zie getViewerNavSections) — alleen beheerders mogen rollen aanmaken/wijzigen/
-- verwijderen. Zelfde split als op team_members hierboven.
drop policy if exists "team admins manage team_roles" on public.team_roles;
drop policy if exists "team members can view team_roles" on public.team_roles;
create policy "team members can view team_roles" on public.team_roles
  for select using (public.is_team_member(owner_user_id));

drop policy if exists "team admins can insert team_roles" on public.team_roles;
create policy "team admins can insert team_roles" on public.team_roles
  for insert with check (public.is_team_admin(owner_user_id));

drop policy if exists "team admins can update team_roles" on public.team_roles;
create policy "team admins can update team_roles" on public.team_roles
  for update using (public.is_team_admin(owner_user_id)) with check (public.is_team_admin(owner_user_id));

drop policy if exists "team admins can delete team_roles" on public.team_roles;
create policy "team admins can delete team_roles" on public.team_roles
  for delete using (public.is_team_admin(owner_user_id));

alter table public.team_members add column if not exists role_id uuid references public.team_roles(id) on delete set null;

-- all_projects=true op de rol geeft toegang tot alle projecten van de eigenaar, ongeacht
-- individuele team_member_project_access-toewijzingen (die blijven wel de manier voor
-- rollen met all_projects=false).
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
          left join public.team_roles tr on tr.id = tm.role_id
          left join public.team_member_project_access tmpa
            on tmpa.team_member_id = tm.id and tmpa.project_id = p.id
          where tm.owner_user_id = p.user_id
            and tm.member_user_id = auth.uid()
            and (coalesce(tr.all_projects, false) or tmpa.project_id is not null)
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
          left join public.team_roles tr on tr.id = tm.role_id
          left join public.team_member_project_access tmpa
            on tmpa.team_member_id = tm.id and tmpa.project_id = p.id
          where tm.owner_user_id = p.user_id
            and tm.member_user_id = auth.uid()
            and (coalesce(tr.all_projects, false) or tmpa.project_id is not null)
            and coalesce(tr.can_view_budget, tm.can_view_budget)
        )
      )
  );
$$;

-- Kan het teamlid data bewerken (i.p.v. alleen bekijken)? UI-niveau check (zie boven);
-- ontbreekt een rol dan is bewerken toegestaan (bestaand gedrag, geen regressie).
create or replace function public.can_edit_project(p_project_id uuid)
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
          left join public.team_roles tr on tr.id = tm.role_id
          where tm.owner_user_id = p.user_id
            and tm.member_user_id = auth.uid()
            and coalesce(tr.can_edit, true)
        )
      )
  );
$$;
