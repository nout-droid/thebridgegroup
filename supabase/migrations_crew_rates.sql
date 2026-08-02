-- Dagtarief, overurentarief en KM-vergoeding per crewlid, met automatische reisafstand
-- (hemelsbrede afstand x correctiefactor, geen betaalde routing-API) tussen woonadres en
-- de podium/locatie-adres van het project. Landt automatisch in de begroting via een
-- "Crew vergoeding"-stelpost, zelfde patroon als syncSejoursCategory voor per_diem_rate.
alter table public.crew_members add column if not exists day_rate numeric not null default 0;
alter table public.crew_members add column if not exists overtime_rate numeric not null default 0;
alter table public.crew_members add column if not exists overtime_hours numeric not null default 0;
alter table public.crew_members add column if not exists home_address text not null default '';
alter table public.crew_members add column if not exists km_rate numeric not null default 0.23;
alter table public.crew_members add column if not exists distance_km numeric;
