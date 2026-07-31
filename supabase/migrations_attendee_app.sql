-- ========== ATTENDEE APP (self-service event-app voor algemene bezoekers) ==========
-- Nieuwe, publieke portal-surface voor gewone bezoekers (niet crew, niet geaccrediteerde
-- VIP's): een self-service "event app" waar iemand zichzelf registreert met naam/e-mail/
-- bedrijf/functie, terugkomt via e-mail + eigen toegangscode, zijn eigen profiel beheert,
-- het publieke draaiboek (schedule_items) bekijkt, en — alleen na expliciete opt-in — een
-- netwerk-directory van andere opted-in bezoekers ziet en kan bookmarken.
--
-- Trustmodel is identiek aan get_shared_project/get_shared_rundowns: geen directe RLS-
-- toegang voor anon op de tabellen, alleen via SECURITY DEFINER RPC's die bewust maar een
-- smalle, geprivacyde snede van de data teruggeven. De eigenaar/het team heeft via
-- has_project_access wel volledige tabeltoegang (zelfde policy-vorm als event_guests).
--
-- Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.

-- ========== 1. PROJECT-TOGGLE ==========
-- Premium/optioneel: de meeste projecten hebben geen attendee-app nodig, dus default uit.
-- De eigenaar zet 'm per project aan op de projectpagina, en krijgt dan de publieke
-- registratie-URL (/attendee/{share_token}) te zien om te delen.

alter table public.projects add column if not exists attendee_app_enabled boolean not null default false;

-- ========== 2. EVENT_ATTENDEES ==========

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  email text,
  company text,
  title text,
  bio text,
  photo_url text,
  networking_opt_in boolean not null default false,
  access_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_attendees_project_id_idx on public.event_attendees(project_id);

alter table public.event_attendees enable row level security;

-- Zelfde policy-vorm als event_guests: alleen de eigenaar/het team met projecttoegang mag
-- rechtstreeks bij deze tabel. De attendee zelf heeft geen Supabase-sessie (net als guest/
-- crew/supplier) — die gaat via de SECURITY DEFINER RPC's hieronder + een eigen cookie op
-- /attendee/[token], geverifieerd met de admin-client in de Next.js server actions (zelfde
-- patroon als isAuthorizedGuest in src/app/guest/[token]/actions.ts).
drop policy if exists "owner full access on event_attendees" on public.event_attendees;
create policy "owner full access on event_attendees" on public.event_attendees
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- ========== 3. EVENT_ATTENDEE_SAVED_CONTACTS ==========
-- Bewust simpel: alleen bookmarken, geen chat en geen connectieverzoeken/goedkeuring — dat is
-- te veel scope voor deze iteratie (zie rapport/toekomstideeën).

create table if not exists public.event_attendee_saved_contacts (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid not null references public.event_attendees(id) on delete cascade,
  saved_attendee_id uuid not null references public.event_attendees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (attendee_id, saved_attendee_id)
);

create index if not exists event_attendee_saved_contacts_attendee_id_idx
  on public.event_attendee_saved_contacts(attendee_id);
create index if not exists event_attendee_saved_contacts_saved_attendee_id_idx
  on public.event_attendee_saved_contacts(saved_attendee_id);

alter table public.event_attendee_saved_contacts enable row level security;

drop policy if exists "owner full access on event_attendee_saved_contacts" on public.event_attendee_saved_contacts;
create policy "owner full access on event_attendee_saved_contacts" on public.event_attendee_saved_contacts
  for all using (
    exists (
      select 1 from public.event_attendees a
      join public.projects p on p.id = a.project_id
      where a.id = attendee_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.event_attendees a
      join public.projects p on p.id = a.project_id
      where a.id = attendee_id and public.has_project_access(p.id)
    )
  );

-- ========== 4. STORAGE: PROFIELFOTO'S ==========
-- Publieke bucket (zoals project-media/org-logos) omdat een profielfoto zichtbaar moet zijn
-- in de directory van andere bezoekers, die geen Supabase-sessie hebben. Uploads lopen altijd
-- via de service-role admin-client in de attendee-server-actions (ná de cookie-gate), dus
-- bewust geen aparte insert/update/delete-policy nodig — net als bij portal-documents/
-- quote_documents voor leveranciers.

insert into storage.buckets (id, name, public)
values ('attendee-photos', 'attendee-photos', true)
on conflict (id) do nothing;

-- ========== 5. RPC'S ==========

-- Registratie: maakt een nieuwe attendee-rij aan (of, als hetzelfde e-mailadres al voor dit
-- project geregistreerd stond, ververst 'm i.p.v. een dubbel profiel aan te maken en geeft
-- meteen een nieuwe access_code terug) — dat dient tegelijk als lichte "code vergeten"-route,
-- aangezien er in deze iteratie geen e-mailbezorging is. Alleen mogelijk als de eigenaar de
-- attendee-app voor dit project heeft aangezet.
create or replace function public.register_attendee(
  p_project_token uuid,
  p_name text,
  p_email text default null,
  p_company text default null,
  p_title text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_email text := nullif(trim(p_email), '');
  v_code text;
  v_attendee_id uuid;
begin
  select id into v_project_id
  from public.projects
  where share_token = p_project_token and attendee_app_enabled = true;

  if v_project_id is null then
    raise exception 'Attendee app is not enabled for this event.';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Name is required.';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  if v_email is not null then
    select id into v_attendee_id
    from public.event_attendees
    where project_id = v_project_id and lower(email) = lower(v_email)
    limit 1;
  end if;

  if v_attendee_id is not null then
    update public.event_attendees
    set name = trim(p_name),
        company = nullif(trim(p_company), ''),
        title = nullif(trim(p_title), ''),
        access_code = v_code
    where id = v_attendee_id;
  else
    insert into public.event_attendees (project_id, name, email, company, title, access_code)
    values (v_project_id, trim(p_name), v_email, nullif(trim(p_company), ''), nullif(trim(p_title), ''), v_code)
    returning id into v_attendee_id;
  end if;

  return json_build_object('attendee_id', v_attendee_id, 'access_code', v_code);
end;
$$;

grant execute on function public.register_attendee(uuid, text, text, text, text) to anon;

-- Login: e-mail + eigen toegangscode (geen apart wachtwoord — de code zelf is het geheim).
create or replace function public.verify_attendee_login(p_project_token uuid, p_email text, p_access_code text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select a.id
  from public.event_attendees a
  join public.projects p on p.id = a.project_id
  where p.share_token = p_project_token
    and p.attendee_app_enabled = true
    and a.email is not null
    and lower(a.email) = lower(trim(p_email))
    and upper(a.access_code) = upper(trim(p_access_code))
  limit 1;
$$;

grant execute on function public.verify_attendee_login(uuid, text, text) to anon;

-- Eigen "startscherm"-data: profiel (incl. e-mail — alleen zichtbaar voor zichzelf) + project-
-- naam/datum + het publieke draaiboek (schedule_items, zonder de interne notes/uitvoerders-
-- velden uit get_shared_production — dat niveau van detail is production-intern, niet voor
-- algemene bezoekers).
create or replace function public.get_attendee_home(p_attendee_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'attendee', json_build_object(
      'id', a.id,
      'name', a.name,
      'email', a.email,
      'company', a.company,
      'title', a.title,
      'bio', a.bio,
      'photo_url', a.photo_url,
      'networking_opt_in', a.networking_opt_in
    ),
    'project', json_build_object(
      'id', p.id,
      'name', p.name,
      'event_date', p.event_date
    ),
    'agenda', coalesce((
      select json_agg(
        json_build_object(
          'id', si.id,
          'stage_name', st.name,
          'activity_date', si.activity_date,
          'activity_time', si.activity_time,
          'activity', si.activity
        ) order by si.activity_date, si.activity_time, si.sort_order
      )
      from public.schedule_items si
      left join public.stages st on st.id = si.stage_id
      where si.project_id = p.id
    ), '[]'::json)
  )
  from public.event_attendees a
  join public.projects p on p.id = a.project_id
  where a.id = p_attendee_id;
$$;

grant execute on function public.get_attendee_home(uuid) to anon;

-- Directory: alleen andere attendees die zelf networking_opt_in=true hebben, e-mail nooit
-- meegegeven. Wederkerigheid afgedwongen op DB-niveau: wie zelf niet opted in is, krijgt hier
-- niets terug (de UI toont in dat geval een duidelijke opt-in-prompt i.p.v. een stille lege
-- lijst) — voorkomt dat iemand wel wil meekijken zonder zelf zichtbaar te willen zijn.
create or replace function public.get_attendee_directory(p_project_id uuid, p_requesting_attendee_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'id', a.id,
      'name', a.name,
      'company', a.company,
      'title', a.title,
      'bio', a.bio,
      'photo_url', a.photo_url
    ) order by a.name
  ), '[]'::json)
  from public.event_attendees a
  where a.project_id = p_project_id
    and a.networking_opt_in = true
    and a.id <> p_requesting_attendee_id
    and exists (
      select 1 from public.event_attendees me
      where me.id = p_requesting_attendee_id
        and me.project_id = p_project_id
        and me.networking_opt_in = true
    );
$$;

grant execute on function public.get_attendee_directory(uuid, uuid) to anon;

-- Eigen opgeslagen/bookmarked contacten (naam/bedrijf/functie/foto — nooit e-mail), voor het
-- "Opgeslagen"-tabblad.
create or replace function public.get_attendee_saved_contacts(p_attendee_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'id', a.id,
      'name', a.name,
      'company', a.company,
      'title', a.title,
      'bio', a.bio,
      'photo_url', a.photo_url,
      'saved_at', sc.created_at
    ) order by sc.created_at desc
  ), '[]'::json)
  from public.event_attendee_saved_contacts sc
  join public.event_attendees a on a.id = sc.saved_attendee_id
  where sc.attendee_id = p_attendee_id and a.networking_opt_in = true;
$$;

grant execute on function public.get_attendee_saved_contacts(uuid) to anon;

-- Eigen profiel bewerken: alleen bio/company/title/photo_url/networking_opt_in — bewust geen
-- naam/e-mail hier (e-mail is de inlog-identiteit, wijzigen daarvan hoort niet in deze lichte
-- self-edit-RPC thuis). Zelfde anon-RPC-schrijfpatroon als add_crew_note/
-- upsert_intake_checklist_answer_by_client/add_client_request elders: p_attendee_id (een
-- ongokbare uuid, alleen bekend bij de ingelogde attendee via zijn eigen cookie) is hier de
-- autorisatiegrens, net als p_token/p_share_token bij die functies.
create or replace function public.update_attendee_profile(
  p_attendee_id uuid,
  p_bio text default null,
  p_company text default null,
  p_title text default null,
  p_photo_url text default null,
  p_networking_opt_in boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Een NULL-parameter betekent "dit veld niet aanraken" (voor toekomstige gedeeltelijke
  -- updates); een lege string betekent expliciet leegmaken — zo kan de attendee zijn bio/
  -- bedrijf/functie ook weer wissen in plaats van dat een leeg formulierveld stilzwijgend de
  -- oude waarde laat staan.
  update public.event_attendees
  set bio = case when p_bio is null then bio else nullif(trim(p_bio), '') end,
      company = case when p_company is null then company else nullif(trim(p_company), '') end,
      title = case when p_title is null then title else nullif(trim(p_title), '') end,
      photo_url = coalesce(p_photo_url, photo_url),
      networking_opt_in = coalesce(p_networking_opt_in, networking_opt_in)
  where id = p_attendee_id;
end;
$$;

grant execute on function public.update_attendee_profile(uuid, text, text, text, text, boolean) to anon;

-- Bewaren/bookmarken van een andere (opted-in) attendee. Alleen mogelijk binnen hetzelfde
-- project en alleen als het doelwit zelf networking_opt_in=true heeft — voorkomt dat iemand
-- via de client een niet-opted-in profiel alsnog kan "opslaan" en zo het bestaan ervan kan
-- afleiden.
create or replace function public.save_attendee_contact(p_attendee_id uuid, p_saved_attendee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_attendee_saved_contacts (attendee_id, saved_attendee_id)
  select p_attendee_id, p_saved_attendee_id
  from public.event_attendees me
  join public.event_attendees target on target.project_id = me.project_id
  where me.id = p_attendee_id
    and target.id = p_saved_attendee_id
    and target.networking_opt_in = true
    and target.id <> me.id
  on conflict (attendee_id, saved_attendee_id) do nothing;
end;
$$;

grant execute on function public.save_attendee_contact(uuid, uuid) to anon;

create or replace function public.unsave_attendee_contact(p_attendee_id uuid, p_saved_attendee_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.event_attendee_saved_contacts
  where attendee_id = p_attendee_id and saved_attendee_id = p_saved_attendee_id;
$$;

grant execute on function public.unsave_attendee_contact(uuid, uuid) to anon;
