-- Offerte krijgt een vrij tekstveld (bv. voorwaarden/toelichting), de factuur krijgt IBAN
-- (organisatie-breed, hetzelfde rekeningnummer voor elke factuur) en een klantreferentie
-- (per project, staat ook op de offerte zodat beide documenten naar elkaar te herleiden zijn).
alter table public.projects add column if not exists quote_notes text;
alter table public.projects add column if not exists client_reference text;
alter table public.organizations add column if not exists iban text;
