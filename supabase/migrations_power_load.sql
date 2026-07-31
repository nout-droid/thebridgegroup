-- Stroom: elektrische belasting (ampere + fase) per aanvraag, zodat er een echte belasting
-- per podium/area uit te rekenen valt i.p.v. alleen een vrije-tekst omschrijving (bv.
-- "32A 3-fase" typen in het "Wat"-veld). Puur additief, bestaande rijen krijgen amps = null
-- (dus geen bijdrage aan het totaal totdat iemand het invult) en phase = 1 als default.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.power_requests add column if not exists amps numeric;
alter table public.power_requests add column if not exists phase smallint not null default 1 check (phase in (1, 3));
