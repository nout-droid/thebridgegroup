-- Moneybird-koppeling (boekhouding): per organisatie een eigen administration_id + access
-- token, inert totdat de gebruiker die zelf invult bij Instellingen (zelfde patroon als de
-- Stripe-scaffold: code + schema nu klaar, pas actief zodra de sleutel er is).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.organizations add column if not exists moneybird_administration_id text;
alter table public.organizations add column if not exists moneybird_access_token text;

alter table public.projects add column if not exists moneybird_invoice_id text;
alter table public.projects add column if not exists moneybird_synced_at timestamptz;
