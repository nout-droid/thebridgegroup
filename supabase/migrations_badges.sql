-- Accreditatiebadges: los, niet-raadbaar token per crewlid voor de publieke QR-scanpagina.
-- Voer dit één keer uit in de Supabase SQL Editor.

alter table public.crew_members add column if not exists badge_token uuid not null default gen_random_uuid() unique;
