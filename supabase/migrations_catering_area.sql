-- Catering had, in tegenstelling tot Materieel/Comms/Stroom, nog geen podium/area-koppeling
-- — nodig om orders per podium te kunnen filteren en totalen per area te tonen, niet alleen
-- per dag. Puur additief, bestaande orders krijgen stage_id = null (projectbreed).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.catering_orders add column if not exists stage_id uuid references public.stages(id) on delete set null;
create index if not exists catering_orders_stage_id_idx on public.catering_orders(stage_id);
