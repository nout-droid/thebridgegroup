-- Rate limiting voor alle login-/aanmeld-/wachtwoord-reset-acties in de app (owner-login,
-- signup, password reset, client/crew/showcaller/supplier/client-account portal-logins).
-- Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.
--
-- De applicatiecode (src/lib/server/rate-limit.ts) faalt open (blokkeert nooit) zolang
-- deze tabel nog niet bestaat, dus dit kan veilig later gedraaid worden zonder dat er
-- ondertussen iets stuk gaat.

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_scope_identifier_idx
  on public.login_attempts(scope, identifier, created_at);

-- Alleen de service-role (server-side) schrijft/leest deze tabel — nooit rechtstreeks
-- vanuit de browser, dus RLS staat aan zonder policies (alles wordt geblokkeerd voor
-- anon/authenticated, en de service-role bypassed RLS toch altijd).
alter table public.login_attempts enable row level security;

-- Opschoning: verwijder pogingen ouder dan 24 uur zodat de tabel niet onbeperkt groeit.
-- Roep dit periodiek aan (bijvoorbeeld vanuit de bestaande /api/cron/backup-route, of
-- handmatig) — een aparte cron is hier niet strikt nodig gezien het beperkte volume.
create or replace function public.cleanup_old_login_attempts()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_attempts where created_at < now() - interval '24 hours';
$$;
