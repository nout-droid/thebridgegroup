-- ========== ATTENDEE QR-CONNECT ==========
-- Elke attendee krijgt een eigen onraadbare qr_token naast de e-mail/toegangscode-login. Die
-- wordt als QR-code op hun eigen profielscherm getoond (server-side gegenereerd, zie
-- /attendee/[token]/qr — de token zelf verlaat de server nooit, alleen de afbeelding). Een
-- andere attendee die 'm scant komt op /attendee-connect/[qr_token] terecht en wordt daar
-- (na inloggen/registreren voor dit event, indien nodig) automatisch verbonden — hergebruikt
-- bewust dezelfde save_attendee_contact-RPC (supabase/full_schema.sql), dus dezelfde
-- privacyregels (alleen mogelijk als het doelwit zelf networking_opt_in=true heeft) als
-- handmatig bewaren via de Netwerk-tab. Geen nieuwe RPC nodig voor het opslaan; alleen de
-- kolom hieronder plus een (server-side, admin-client) lookup op qr_token in de nieuwe
-- route/pagina.

alter table public.event_attendees add column if not exists qr_token uuid not null default gen_random_uuid();
create unique index if not exists event_attendees_qr_token_idx on public.event_attendees(qr_token);
