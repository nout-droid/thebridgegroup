-- Klant-login met Event ID + wachtwoord (i.p.v. alleen een geheime link).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.projects add column if not exists event_code text;
alter table public.projects add column if not exists client_password_hash text;

update public.projects
set event_code = upper(substr(md5(random()::text || id::text), 1, 6))
where event_code is null;

alter table public.projects alter column event_code set not null;
create unique index if not exists projects_event_code_idx on public.projects (event_code);

-- Geeft het share_token terug bij een geldige Event ID + wachtwoord combinatie, anders null.
-- security definer zodat de publieke inlogpagina dit kan aanroepen zonder rechtstreekse
-- tabeltoegang tot projects (die alleen de eigenaar mag lezen).

create or replace function public.verify_client_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and client_password_hash is not null
    and client_password_hash = crypt(p_password, client_password_hash)
  limit 1;
$$;

grant execute on function public.verify_client_login(text, text) to anon;

-- Zet (of wijzigt) het klantwachtwoord van een project. security invoker: de bestaande
-- eigenaar-RLS-policy op projects zorgt dat dit alleen de eigen projecten kan raken.

create or replace function public.set_client_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set client_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_client_password(uuid, text) to authenticated;
