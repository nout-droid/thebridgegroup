-- Callsheet-export: rider-secties markeren die in de callsheet-PDF terecht moeten
-- komen. Voer dit één keer uit in de Supabase SQL Editor.

alter table public.rider_sections add column if not exists include_in_callsheet boolean not null default false;
