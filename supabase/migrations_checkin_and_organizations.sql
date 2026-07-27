-- Nacht-batch: (1) gasten-/accreditatie check-in (concurrent-gap t.o.v. Cvent OnArrival:
-- gastenlijst + RSVP + real-time inchecken op de badge-QR, i.p.v. alleen een statische
-- toegangsstatus), en (2) een additieve 'organizations'-laag als fundament om de tool op
-- termijn als abonnement aan andere AV-bedrijven te kunnen aanbieden (zie rapport in de chat
-- voor de volledige toelichting/risico-afweging). Voer dit één keer uit in de Supabase SQL
-- Editor, ná de eerdere migraties.

-- ========== 1. CHECK-IN ==========

alter table public.crew_members add column if not exists checked_in_at timestamptz;

create table if not exists public.event_guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  guest_type text not null default 'gast',
  rsvp_status text not null default 'uitgenodigd',
  plus_ones int not null default 0,
  notes text not null default '',
  badge_token uuid not null default gen_random_uuid() unique,
  checked_in_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_guests_project_id_idx on public.event_guests(project_id);

alter table public.event_guests enable row level security;

drop policy if exists "owner full access on event_guests" on public.event_guests;
create policy "owner full access on event_guests" on public.event_guests
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- Geen anon-policy nodig: de gasten-badgepagina (/guest-badge/[token]) gebruikt, net als de
-- bestaande crew-badgepagina, de service-role admin-client om badge_token op te zoeken —
-- dezelfde bearer-token-via-QR-aanpak die al voor crew_members bestaat.

-- ========== 2. ORGANIZATIONS (additief fundament voor abonnement/SaaS) ==========
-- Puur additief: bestaande RLS-policies (has_project_access, is_team_member, etc.) blijven
-- ongewijzigd en werken al per owner_user_id/project.user_id. Deze tabel voegt alleen een
-- naam, plan en Stripe-koppeling toe per eigenaar-account — niets aan de bestaande
-- toegangslogica verandert.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'The Bridge AV Group',
  logo_url text,
  plan text not null default 'trial',
  subscription_status text not null default 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists organizations_owner_user_id_idx on public.organizations(owner_user_id);

alter table public.organizations enable row level security;

drop policy if exists "team can view organization" on public.organizations;
create policy "team can view organization" on public.organizations
  for select using (public.is_team_member(owner_user_id));

drop policy if exists "owner can update organization" on public.organizations;
create policy "owner can update organization" on public.organizations
  for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "owner can insert organization" on public.organizations;
create policy "owner can insert organization" on public.organizations
  for insert with check (auth.uid() = owner_user_id);

-- Backfill: elke bestaande projecteigenaar krijgt een organizations-rij zodat de huidige
-- (enige) klant meteen een werkende organisatienaam/plan heeft, zonder dat er iets verandert
-- aan wat ze nu al zien.
insert into public.organizations (owner_user_id, name, plan, subscription_status, trial_ends_at)
select distinct p.user_id, 'The Bridge AV Group', 'pro', 'active', null
from public.projects p
where not exists (
  select 1 from public.organizations o where o.owner_user_id = p.user_id
);

-- Nieuwe self-service signups (zie /signup) krijgen automatisch hun eigen organizations-rij
-- via de signup-server-action (niet via een trigger, zodat de naam die de gebruiker invult
-- meteen wordt opgeslagen).
