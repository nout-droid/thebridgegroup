-- Een cue kan meerdere devisies raken (Audio, Licht, GFX, Playout, Pyro, ...),
-- dus "responsible" (één vrij tekstveld) wordt "divisions" (tekst-array).
-- Voer dit één keer uit in de Supabase SQL Editor, ná migrations_rundown.sql.

alter table public.rundown_items add column if not exists divisions text[] not null default '{}'::text[];

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rundown_items' and column_name = 'responsible'
  ) then
    update public.rundown_items
    set divisions = string_to_array(nullif(trim(responsible), ''), ',')
    where responsible is not null and trim(responsible) <> '';

    alter table public.rundown_items drop column responsible;
  end if;
end $$;
