-- Eigen, per-organisatie bewerkbare huurperiode-staffel voor eigen materiaal (Materiaalbeheer),
-- losgekoppeld van de gedeelde rental_period_multipliers-tabel die (ook) de externe
-- verhuurcatalogus (Rent-All-import) voedt. Zelfde "eenmalig geseed, daarna vrij aan te
-- passen"-patroon als team_roles/todo_templates.

create table if not exists public.equipment_rental_period_multipliers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  min_days int not null,
  label text not null,
  multiplier numeric not null,
  unique (owner_user_id, min_days)
);

create index if not exists equipment_rental_period_multipliers_owner_user_id_idx
  on public.equipment_rental_period_multipliers(owner_user_id);

alter table public.equipment_rental_period_multipliers enable row level security;

drop policy if exists "team members can view equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers;
create policy "team members can view equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers
  for select using (public.is_team_member(owner_user_id));
drop policy if exists "team members can insert equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers;
create policy "team members can insert equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers
  for insert with check (public.is_team_member(owner_user_id));
drop policy if exists "team members can update equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers;
create policy "team members can update equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers
  for update using (public.is_team_member(owner_user_id)) with check (public.is_team_member(owner_user_id));
drop policy if exists "team members can delete equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers;
create policy "team members can delete equipment_rental_period_multipliers" on public.equipment_rental_period_multipliers
  for delete using (public.is_team_member(owner_user_id));

grant select, insert, update, delete on public.equipment_rental_period_multipliers to authenticated;

create or replace function public.equipment_rental_multiplier(p_owner_id uuid, p_days int)
returns numeric
language sql
security invoker
stable
as $$
  select coalesce(
    (select multiplier from public.equipment_rental_period_multipliers
     where owner_user_id = p_owner_id and min_days <= p_days
     order by min_days desc limit 1),
    1
  );
$$;

grant execute on function public.equipment_rental_multiplier(uuid, int) to authenticated;
