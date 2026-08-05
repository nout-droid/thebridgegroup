-- nav.tsx draait op vrijwel elke ingelogde pagina en berekende de CO2-badge tot nu toe door
-- ALLE rijen van crew_members/categories/quotes naar de client te halen (alleen RLS-gescoped,
-- geen limit/aggregatie) en dan in JS te sommeren — kosten groeien met de totale omvang van de
-- organisatie en dit gebeurt bij elke navigatie. Eén RPC die de som in Postgres zelf doet i.p.v.
-- alle losse rijen te versturen. security invoker (geen definer) zodat dezelfde RLS-policies
-- blijven gelden als de losse table-queries die dit vervangt — geen expliciete owner-scoping
-- nodig, exact hetzelfde scope-gedrag als voorheen.
create or replace function public.co2_totals()
returns table (flight_count bigint, total_km numeric, total_co2_kg numeric)
language sql
security invoker
stable
as $$
  select
    (select count(*) from public.crew_members where needs_flight = true) as flight_count,
    (select coalesce(sum(estimated_km), 0) from public.categories) as total_km,
    (select coalesce(sum(co2_kg), 0) from public.quotes) as total_co2_kg;
$$;

grant execute on function public.co2_totals() to authenticated;
