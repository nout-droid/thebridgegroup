-- Contingency-plan (plan B) voor outdoor events: getoond aan crew/showcaller zodra er een
-- weeralert actief is. Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.projects add column if not exists is_outdoor boolean not null default false;
alter table public.projects add column if not exists contingency_plan text not null default '';
