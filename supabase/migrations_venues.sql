-- Locatiecatalogus (venues): een herbruikbare bibliotheek van locaties met hun technische
-- specificaties (stroom, laad-in-toegang, afmetingen, rigging, wifi, contactpersoon), zodat
-- producers deze info niet steeds opnieuw hoeven te verzamelen als ze een eerder gebruikte
-- locatie weer boeken voor een nieuw event. Zelfde eigenaarschapsmodel als leveranciers
-- (suppliers): user_id = eigenaar, teamleden mogen lezen/bewerken, alleen team-admins mogen
-- verwijderen (identiek aan de policies op public.suppliers).
-- Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  capacity int,
  power_availability text,
  load_in_access text,
  dimensions text,
  rigging_notes text,
  wifi_notes text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists venues_user_id_idx on public.venues(user_id);

alter table public.venues enable row level security;

drop policy if exists "team members can view/edit venues" on public.venues;
create policy "team members can view/edit venues" on public.venues
  for select using (public.is_team_member(user_id));
drop policy if exists "team members can insert venues" on public.venues;
create policy "team members can insert venues" on public.venues
  for insert with check (public.is_team_member(user_id));
drop policy if exists "team members can update venues" on public.venues;
create policy "team members can update venues" on public.venues
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
drop policy if exists "team admins can delete venues" on public.venues;
create policy "team admins can delete venues" on public.venues
  for delete using (public.is_team_admin(user_id));

-- Een project mag optioneel verwijzen naar een locatie uit de catalogus, i.p.v. steeds losse
-- locatiegegevens per project te moeten invullen. on delete set null: een locatie verwijderen
-- uit de catalogus mag nooit een project stuk maken, het ontkoppelt alleen de verwijzing.
alter table public.projects add column if not exists venue_id uuid references public.venues(id) on delete set null;
create index if not exists projects_venue_id_idx on public.projects(venue_id);
