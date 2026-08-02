-- Weerswaarschuwing per e-mail (cron): voorkomt dat we hetzelfde project elke dag opnieuw
-- bevragen/mailen zodra er al een waarschuwing is verstuurd.
alter table public.projects add column if not exists weather_alert_sent_at timestamptz;

-- Symmetrisch aan checked_in_at — check-out via dezelfde badge-QR-scanpagina.
alter table public.crew_members add column if not exists checked_out_at timestamptz;
alter table public.event_guests add column if not exists checked_out_at timestamptz;
