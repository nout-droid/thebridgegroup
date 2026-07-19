-- Projectperiode: vervangt het losse "aantal huurdagen"-getal door echte datums
-- (bouw/afbouw + showperiode + dag/nacht). Voer dit één keer uit in de Supabase SQL Editor.

alter table public.projects add column if not exists build_start_date date;
alter table public.projects add column if not exists strike_end_date date;
alter table public.projects add column if not exists show_start_date date;
alter table public.projects add column if not exists show_end_date date;
alter table public.projects add column if not exists show_type text not null default 'dag' check (show_type in ('dag', 'nacht', 'beide'));

-- Best-effort backfill voor bestaande projecten, zodat er niets verdwijnt.
update public.projects
set build_start_date = coalesce(build_start_date, event_date),
    strike_end_date = coalesce(strike_end_date, event_date + (greatest(rental_days, 1) - 1))
where build_start_date is null;

alter table public.projects drop column if exists rental_days;
