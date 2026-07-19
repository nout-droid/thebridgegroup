-- Vliegtickets: vlag + details per crewlid, voor de vluchtaanvraag-export naar een
-- boekingsagency. Voer dit één keer uit in de Supabase SQL Editor.

alter table public.crew_members add column if not exists needs_flight boolean not null default false;
alter table public.crew_members add column if not exists passport_number text not null default '';
alter table public.crew_members add column if not exists flight_departure_airport text not null default '';
alter table public.crew_members add column if not exists flight_destination text not null default '';
alter table public.crew_members add column if not exists flight_departure_at timestamptz;
alter table public.crew_members add column if not exists flight_return_at timestamptz;
alter table public.crew_members add column if not exists flight_booking_number text not null default '';
alter table public.crew_members add column if not exists flight_ticket_number text not null default '';
