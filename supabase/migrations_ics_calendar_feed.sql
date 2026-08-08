-- Kalendersync (ICS-feed): elke organisatie krijgt een geheime, niet-giswerk token waarmee
-- Google/Outlook/Apple Calendar zich kunnen abonneren op een read-only feed van alle projecten
-- (build_start_date t/m strike_end_date, met fallback op show/event-datum, zelfde venster als
-- /calendar). De feed-route gebruikt de service-role client (geen ingelogde sessie mogelijk
-- vanuit een kalender-app), dus de token zelf IS de autorisatie — vandaar uuid + unique index,
-- en een "vernieuw link"-actie voor als hij per ongeluk gedeeld wordt.
alter table public.organizations add column if not exists ics_token uuid not null default gen_random_uuid();
create unique index if not exists organizations_ics_token_key on public.organizations(ics_token);
