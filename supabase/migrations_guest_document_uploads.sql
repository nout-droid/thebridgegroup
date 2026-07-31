-- Gastenportaal: gasten konden tot nu toe alleen documenten downloaden die de eigenaar
-- klaarzette (bv. een rider), maar niet zelf iets aanleveren (bv. een ID-scan of
-- verzekeringsbewijs ter accreditatie). Dit voegt dat toe: hetzelfde gastenportaal
-- (/guest/[token]) krijgt een upload-formulier, met een uploaded_by-kolom om eigen
-- documenten (voor gasten) te onderscheiden van door gasten aangeleverde documenten.
-- Puur additief — bestaande rijen krijgen uploaded_by = 'owner', huidig gedrag verandert niet.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.guest_documents add column if not exists uploaded_by text not null default 'owner' check (uploaded_by in ('owner', 'guest'));

-- Activiteitenlog kende alleen 'client' en 'supplier' als actor — een gast-upload moet ook
-- op het projectdashboard verschijnen, dus 'guest' toevoegen aan de toegestane waarden.
alter table public.activity_log drop constraint if exists activity_log_actor_type_check;
alter table public.activity_log add constraint activity_log_actor_type_check check (actor_type in ('client', 'supplier', 'guest'));
