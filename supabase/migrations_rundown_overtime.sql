-- Nieuwe kolom om de daadwerkelijke starttijd van de show vast te leggen
-- (los van start_time, dat is enkel de geplande klok-tijd voor weergave).
-- Hiermee kan de totale opgelopen overtijd over de hele show berekend
-- worden (som van vertraging van alle voorgaande cues + overtijd van de
-- huidige cue), niet alleen de overtijd van de huidige cue op zich.
alter table public.rundowns add column if not exists actual_start_at timestamptz;
