-- Comms & Portofoons: optionele koppeling met een crewlid (accreditatie-ID).
-- Voer dit één keer uit in de Supabase SQL Editor.

alter table public.comms_assignments
  add column if not exists crew_member_id uuid references public.crew_members(id) on delete set null;

create index if not exists comms_assignments_crew_member_id_idx on public.comms_assignments(crew_member_id);
