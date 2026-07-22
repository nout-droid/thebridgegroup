-- Materieel en Comms & Portofoons hadden nog geen podium/area-koppeling (in tegenstelling tot
-- Stroom en Crew Planning, die dat al wel hadden) — nodig om op area te kunnen filteren.
alter table public.equipment_reservations add column if not exists stage_id uuid references public.stages(id) on delete set null;
create index if not exists equipment_reservations_stage_id_idx on public.equipment_reservations(stage_id);

alter table public.comms_assignments add column if not exists stage_id uuid references public.stages(id) on delete set null;
create index if not exists comms_assignments_stage_id_idx on public.comms_assignments(stage_id);
