-- Showcaller-toegang per podium: optioneel, aanvullend wachtwoord per stage.
-- Voer dit één keer uit in de Supabase SQL Editor van een BESTAAND project
-- (nieuwe projecten krijgen dit al via full_schema.sql). Idempotent.
--
-- Het project-brede showcaller-wachtwoord (projects.showcaller_password_hash)
-- blijft gewoon werken en geeft volledige toegang tot alle podia. Een
-- podium-wachtwoord is een aanvullende, beperktere inlog die alleen dat ene
-- podium laat zien/bedienen.

alter table public.stages add column if not exists showcaller_password_hash text;

create or replace function public.verify_showcaller_login(p_event_code text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
declare
  v_share_token uuid;
  v_stage_id uuid;
begin
  select share_token into v_share_token
  from public.projects
  where upper(event_code) = upper(p_event_code)
    and showcaller_password_hash is not null
    and showcaller_password_hash = crypt(p_password, showcaller_password_hash)
  limit 1;

  if v_share_token is not null then
    return json_build_object('share_token', v_share_token, 'stage_id', null);
  end if;

  select p.share_token, s.id into v_share_token, v_stage_id
  from public.stages s
  join public.projects p on p.id = s.project_id
  where upper(p.event_code) = upper(p_event_code)
    and s.showcaller_password_hash is not null
    and s.showcaller_password_hash = crypt(p_password, s.showcaller_password_hash)
  limit 1;

  if v_share_token is not null then
    return json_build_object('share_token', v_share_token, 'stage_id', v_stage_id);
  end if;

  return null;
end;
$$;

grant execute on function public.verify_showcaller_login(text, text) to anon;

create or replace function public.set_stage_showcaller_password(p_stage_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.stages
  set showcaller_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_stage_id;
$$;

grant execute on function public.set_stage_showcaller_password(uuid, text) to authenticated;
