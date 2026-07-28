-- Klantaccounts: een terugkerende opdrachtgever kan één account krijgen dat aan meerdere
-- projecten gekoppeld is (i.p.v. steeds een los Event ID + wachtwoord per project), met een
-- door de eigenaar ingestelde openheid van de begroting en editrechten. De bestaande
-- projectspecifieke klant-login (Event ID + wachtwoord, get_shared_project zonder
-- client_account) blijft ongewijzigd bestaan als lichter alternatief.
-- Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  password_hash text not null,
  budget_access text not null default 'closed' check (budget_access in ('closed', 'open')),
  can_edit_checklist boolean not null default true,
  can_submit_requests boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_user_id, email)
);

create index if not exists client_accounts_owner_user_id_idx on public.client_accounts(owner_user_id);

alter table public.client_accounts enable row level security;

drop policy if exists "team manage client_accounts" on public.client_accounts;
create policy "team manage client_accounts" on public.client_accounts
  for all using (public.is_team_member(owner_user_id))
  with check (public.is_team_member(owner_user_id));

create table if not exists public.client_account_projects (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.client_accounts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_account_id, project_id)
);

create index if not exists client_account_projects_account_idx on public.client_account_projects(client_account_id);
create index if not exists client_account_projects_project_idx on public.client_account_projects(project_id);

alter table public.client_account_projects enable row level security;

drop policy if exists "team manage client_account_projects" on public.client_account_projects;
create policy "team manage client_account_projects" on public.client_account_projects
  for all using (
    exists (
      select 1 from public.client_accounts ca
      where ca.id = client_account_id and public.is_team_member(ca.owner_user_id)
    )
  ) with check (
    exists (
      select 1 from public.client_accounts ca
      where ca.id = client_account_id and public.is_team_member(ca.owner_user_id)
    )
  );

-- Wachtwoord instellen/wijzigen vanaf de eigenaar-kant (zelfde crypt()-patroon als de overige
-- portal-wachtwoorden in dit project).
create or replace function public.set_client_account_password(p_account_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.client_accounts
  set password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_account_id;
$$;

grant execute on function public.set_client_account_password(uuid, text) to authenticated;

-- Login met e-mail + wachtwoord. crypt() gebruikt de salt uit password_hash zelf, dus zelfs als
-- twee verschillende Bridge-achtige bedrijven (organizations) toevallig een klant met hetzelfde
-- e-mailadres hebben, matcht dit alleen de rij waarvan het wachtwoord ook klopt.
create or replace function public.login_client_account(p_email text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select id from public.client_accounts
  where lower(email) = lower(p_email)
    and password_hash = crypt(p_password, password_hash)
  limit 1;
$$;

grant execute on function public.login_client_account(text, text) to anon;

-- Projecten die aan dit klantaccount gekoppeld zijn (voor het "mijn projecten"-overzicht).
create or replace function public.get_client_account_projects(p_account_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'client_name', p.client_name,
      'event_date', p.event_date,
      'status', p.status,
      'share_token', p.share_token
    ) order by p.event_date desc nulls last, p.name
  ), '[]'::json)
  from public.client_account_projects cap
  join public.projects p on p.id = cap.project_id
  where cap.client_account_id = p_account_id;
$$;

grant execute on function public.get_client_account_projects(uuid) to anon;

-- get_shared_project uitgebreid met een optioneel klantaccount: als dat account gekoppeld is
-- aan dit project ÉN budget_access = 'closed', worden inkoopprijs/marge/leverancier/
-- materiaal-specificatie per onderdeel verborgen (null/leeg) — de klant ziet dan alleen de
-- eigen prijs per onderdeel ("gesloten begroting per area"). Zonder klantaccount (de bestaande
-- Event ID-login) verandert er niets: die blijft de volledige ("open") weergave krijgen, zoals
-- vandaag al het geval is.
-- Let op: een extra parameter toevoegen via create-or-replace maakt in Postgres een NIEUWE
-- overload i.p.v. de oude functie te vervangen (overload-resolutie gaat op parameterlijst) —
-- daarom eerst de oude 1-parameter-versie expliciet droppen, anders blijven beide bestaan en
-- roept een aanroep met 1 argument per ongeluk de oude (niet-klantaccount-bewuste) versie aan.
drop function if exists public.get_shared_project(uuid);

create or replace function public.get_shared_project(p_token uuid, p_client_account_id uuid default null)
returns json
language sql
security definer
set search_path = public
stable
as $$
  with proj as (
    select * from public.projects where share_token = p_token
  ),
  access as (
    select case
      when p_client_account_id is null then false
      else coalesce(
        (
          select ca.budget_access = 'closed'
          from public.client_accounts ca
          join public.client_account_projects cap on cap.client_account_id = ca.id
          where ca.id = p_client_account_id
            and cap.project_id = (select id from proj)
        ),
        true
      )
    end as budget_closed
  ),
  cat_data as (
    select
      c.id,
      c.stage_id,
      c.name,
      c.sort_order,
      c.status,
      c.margin_type,
      c.margin_value,
      coalesce(chosen.cost_price, c.manual_cost) as cost_price,
      chosen.supplier_name,
      case
        when coalesce(chosen.cost_price, c.manual_cost) is null then null
        when c.margin_type = 'percentage' then round(coalesce(chosen.cost_price, c.manual_cost) * (1 + c.margin_value / 100), 2)
        else coalesce(chosen.cost_price, c.manual_cost) + c.margin_value
      end as client_price,
      coalesce(chosen.line_items, '[]'::json) as line_items
    from public.categories c
    join proj p on p.id = c.project_id
    left join lateral (
      select
        q.cost_price,
        s.name as supplier_name,
        (
          select json_agg(
            json_build_object(
              'description', qli.description,
              'quantity', qli.quantity,
              'unit_price', qli.unit_price
            ) order by qli.created_at
          )
          from public.quote_line_items qli
          where qli.quote_id = q.id
        ) as line_items
      from public.quotes q
      join public.suppliers s on s.id = q.supplier_id
      where q.category_id = c.id and q.status = 'gekozen'
      limit 1
    ) chosen on true
  ),
  cat_json as (
    select
      cd.stage_id,
      json_build_object(
        'id', cd.id,
        'name', cd.name,
        'sort_order', cd.sort_order,
        'status', cd.status,
        'margin_type', case when a.budget_closed then null else cd.margin_type end,
        'margin_value', case when a.budget_closed then null else cd.margin_value end,
        'cost_price', case when a.budget_closed then null else cd.cost_price end,
        'supplier_name', case when a.budget_closed then null else cd.supplier_name end,
        'client_price', cd.client_price,
        'line_items', case when a.budget_closed then '[]'::json else cd.line_items end
      ) as data,
      cd.sort_order
    from cat_data cd, access a
  )
  select json_build_object(
    'project', json_build_object(
      'name', p.name,
      'client_name', p.client_name,
      'event_date', p.event_date,
      'status', p.status,
      'background_image_url', p.background_image_url,
      'budget_approval_status', p.budget_approval_status,
      'budget_approval_comment', p.budget_approval_comment,
      'organization_name', coalesce(
        (select o.name from public.organizations o where o.owner_user_id = p.user_id),
        'The Bridge AV Group'
      ),
      'budget_access', case when (select budget_closed from access) then 'closed' else 'open' end
    ),
    'project_wide_categories', coalesce((
      select json_agg(cj.data order by cj.sort_order)
      from cat_json cj
      where cj.stage_id is null
    ), '[]'::json),
    'stages', coalesce((
      select json_agg(
        json_build_object(
          'id', s.id,
          'name', s.name,
          'categories', coalesce((
            select json_agg(cj.data order by cj.sort_order)
            from cat_json cj
            where cj.stage_id = s.id
          ), '[]'::json)
        ) order by s.sort_order
      )
      from public.stages s
      where s.project_id = p.id
    ), '[]'::json),
    'media', coalesce((
      select json_agg(
        json_build_object('kind', pm.kind, 'url', pm.url, 'caption', pm.caption)
        order by pm.sort_order
      )
      from public.project_media pm
      where pm.project_id = p.id
    ), '[]'::json)
  )
  from proj p;
$$;

grant execute on function public.get_shared_project(uuid, uuid) to anon;

-- upsert_intake_checklist_answer_by_client: optioneel klantaccount, geweigerd als
-- can_edit_checklist uitstaat voor dat account. Zelfde overload-val: eerst de oude 3-parameter
-- versie droppen.
drop function if exists public.upsert_intake_checklist_answer_by_client(uuid, text, text);

create or replace function public.upsert_intake_checklist_answer_by_client(
  p_share_token uuid,
  p_section_key text,
  p_content text,
  p_client_account_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_checklist_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_share_token;
  if v_project_id is null then
    return false;
  end if;

  if p_client_account_id is not null and not exists (
    select 1 from public.client_accounts ca
    join public.client_account_projects cap on cap.client_account_id = ca.id
    where ca.id = p_client_account_id and cap.project_id = v_project_id and ca.can_edit_checklist
  ) then
    return false;
  end if;

  insert into public.intake_checklists (project_id)
  values (v_project_id)
  on conflict (project_id) do nothing;

  select id into v_checklist_id from public.intake_checklists where project_id = v_project_id;

  insert into public.intake_checklist_answers (checklist_id, section_key, content, updated_by)
  values (v_checklist_id, p_section_key, p_content, 'client')
  on conflict (checklist_id, section_key)
  do update set content = excluded.content, updated_by = 'client', updated_at = now();

  update public.intake_checklists set updated_at = now() where id = v_checklist_id;

  insert into public.activity_log (project_id, actor_type, actor_label, category, description)
  values (v_project_id, 'client', 'Klant', 'checklist', 'Checklist ingevuld: ' || p_section_key);

  return true;
end;
$$;

grant execute on function public.upsert_intake_checklist_answer_by_client(uuid, text, text, uuid) to anon;

-- add_client_request: optioneel klantaccount, geweigerd als can_submit_requests uitstaat.
-- Zelfde overload-val: eerst de oude 6-parameter versie droppen.
drop function if exists public.add_client_request(uuid, text, text, int, date, text);

create or replace function public.add_client_request(
  p_share_token uuid,
  p_category text,
  p_description text,
  p_quantity int default 1,
  p_requested_date date default null,
  p_notes text default '',
  p_client_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  select id into v_project_id from public.projects where share_token = p_share_token;
  if v_project_id is null then
    return null;
  end if;

  if p_client_account_id is not null and not exists (
    select 1 from public.client_accounts ca
    join public.client_account_projects cap on cap.client_account_id = ca.id
    where ca.id = p_client_account_id and cap.project_id = v_project_id and ca.can_submit_requests
  ) then
    return null;
  end if;

  insert into public.client_requests (project_id, category, description, quantity, requested_date, notes)
  values (v_project_id, p_category, coalesce(p_description, ''), coalesce(p_quantity, 1), p_requested_date, coalesce(p_notes, ''))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_client_request(uuid, text, text, int, date, text, uuid) to anon;
