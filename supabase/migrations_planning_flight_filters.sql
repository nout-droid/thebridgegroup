-- crew_members had al needs_flight (Vluchten-sectie), maar crew_positions (de planningsslot
-- vóórdat een naam bekend is) nog niet — mirror van needs_catering/needs_hotel die al wel op
-- positieniveau bestaan en doorschieten naar crew_members zodra een naam wordt toegevoegd.
alter table public.crew_positions add column if not exists needs_flight boolean not null default false;
