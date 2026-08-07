-- Publieke RSVP-microsite voor gasten: los invite_token (naast het bestaande badge_token voor
-- check-in), zodat de uitnodigingslink en de badge/check-in-link nooit hetzelfde geheim delen.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.event_guests add column if not exists invite_token uuid not null default gen_random_uuid();
create unique index if not exists event_guests_invite_token_idx on public.event_guests(invite_token);
alter table public.event_guests add column if not exists plus_one_name text not null default '';
alter table public.event_guests add column if not exists dietary_notes text not null default '';
alter table public.event_guests add column if not exists responded_at timestamptz;
