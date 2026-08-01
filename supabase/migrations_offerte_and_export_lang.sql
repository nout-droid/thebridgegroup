-- Offerte (outgoing quote naar de klant, vóór goedkeuring) — zelfde nummering/datum-patroon
-- als de bestaande factuur (invoice_number/invoice_date op projects), los bijgehouden zodat
-- een project zowel een offertenummer als (later) een apart factuurnummer kan hebben.
alter table public.projects add column if not exists quote_number text;
alter table public.projects add column if not exists quote_date date;
