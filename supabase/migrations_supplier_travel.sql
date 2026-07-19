-- Leveranciers de hotel- en vlucht-lijst laten invullen: aan/uit-schakelbaar per project,
-- zodat dit niet standaard bij ons blijft liggen. Voer dit één keer uit in de Supabase SQL Editor.

alter table public.projects add column if not exists suppliers_manage_travel boolean not null default false;
