-- Skills-tags op crew, voor de freelancer-database (/freelancers) en toekomstige matching.
alter table public.crew_members add column if not exists skills text[] not null default '{}';

-- AI-conceptmail voor de klant (project overzicht), gegenereerd op basis van activity_log.
alter table public.projects add column if not exists ai_client_update_draft text;
alter table public.projects add column if not exists ai_client_update_generated_at timestamptz;
