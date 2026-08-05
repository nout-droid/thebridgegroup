-- Inkoop/verkoop-prijs voor crew: freelancers.day_rate/overtime_rate/km_rate blijven de
-- inkoopkosten; deze drie nieuwe, optionele kolommen zijn de verkoopprijs richting de klant.
-- Null = nog niet los ingesteld, UI valt dan terug op de inkoopprijs (geen verkeerde 0-weergave
-- voor bestaande rijen). Zelfde drie kolommen op crew_members zodat een gekoppeld crewlid een
-- snapshot van de verkoopprijs behoudt, net zoals nu al met de inkoopprijs gebeurt.

alter table public.freelancers add column if not exists sell_day_rate numeric;
alter table public.freelancers add column if not exists sell_overtime_rate numeric;
alter table public.freelancers add column if not exists sell_km_rate numeric;

alter table public.crew_members add column if not exists sell_day_rate numeric;
alter table public.crew_members add column if not exists sell_overtime_rate numeric;
alter table public.crew_members add column if not exists sell_km_rate numeric;
