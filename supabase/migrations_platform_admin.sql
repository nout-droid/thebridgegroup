-- Platform-eigenaar backoffice: elke organisatie (dus elke signup, demo of niet) krijgt bij
-- aanmaken automatisch een "platform lead"-rij, zodat Nout als eigenaar van het SaaS-product
-- zelf zijn eigen sales-pipeline kan bijhouden (van demo-aanmelding tot betalende klant, of
-- verloren/opgezegd) — los van de sales_leads-CRM die klanten voor hún EIGEN leads
-- gebruiken. Bewust geen brede RLS-policies: alleen bereikbaar via de service-role client,
-- na een platform-admin check op e-mailadres in de server actions (zie
-- src/lib/server/platform-admin.ts). Zo kan geen enkele klant, ook niet per ongeluk via een
-- lekkende policy, andermans organisatiedata via deze tabel zien.
create table if not exists public.platform_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'demo_given', 'negotiating', 'won', 'lost', 'churned')),
  last_contact_at timestamptz,
  next_follow_up_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_leads_status_idx on public.platform_leads(status);

alter table public.platform_leads enable row level security;
-- Geen policies: default-deny voor iedereen behalve de service-role client.

create table if not exists public.platform_lead_activities (
  id uuid primary key default gen_random_uuid(),
  platform_lead_id uuid not null references public.platform_leads(id) on delete cascade,
  activity_type text not null default 'note' check (activity_type in ('call', 'email', 'meeting', 'note')),
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists platform_lead_activities_lead_idx on public.platform_lead_activities(platform_lead_id);

alter table public.platform_lead_activities enable row level security;
-- Geen policies: default-deny voor iedereen behalve de service-role client.

-- Backfill: bestaande organisaties (van vóór deze feature) krijgen alsnog een platform-lead,
-- met een startstatus afgeleid van hun huidige abonnementsstatus.
insert into public.platform_leads (organization_id, status)
select o.id,
  case
    when o.subscription_status = 'active' then 'won'
    when o.subscription_status = 'canceled' then 'churned'
    else 'new'
  end
from public.organizations o
on conflict (organization_id) do nothing;

-- Sales-CRM (per-klant, sales_leads): volgende follow-up datum erbij — "laatste contact
-- moment" wordt afgeleid van de meest recente sales_lead_activities-rij, geen kolom nodig.
alter table public.sales_leads add column if not exists next_follow_up_date date;
