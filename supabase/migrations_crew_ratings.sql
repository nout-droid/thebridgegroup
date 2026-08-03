-- Crew-beoordeling per functie: mirrort supplier_ratings, maar dan per crew-inzet
-- (crew_members-rij, met de rol waarin iemand die dag werkte) i.p.v. per leverancier.
-- freelancer_id wordt gedenormaliseerd zodat de beoordeling blijft bestaan (en optelbaar
-- blijft per rol) ook als de crew_members-rij van dat project ooit verwijderd wordt.
create table if not exists public.crew_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  freelancer_id uuid references public.freelancers(id) on delete set null,
  role text not null default '',
  rating int not null check (rating between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, crew_member_id)
);

create index if not exists crew_ratings_freelancer_id_idx on public.crew_ratings(freelancer_id);

alter table public.crew_ratings enable row level security;

drop policy if exists "owner full access on crew_ratings" on public.crew_ratings;
create policy "owner full access on crew_ratings" on public.crew_ratings
  for all using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));
