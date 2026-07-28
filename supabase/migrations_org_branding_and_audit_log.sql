-- White-label branding (logo_url bestond al maar werd nooit gebruikt; brand_color is nieuw)
-- + een audit log voor gevoelige acties (team/project verwijderen, rolwijzigingen, etc.).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.organizations add column if not exists brand_color text;

-- Logo-uploads per organisatie. Publieke bucket (net als project-media) omdat het logo
-- ook zichtbaar moet zijn in klant-/leveranciers-/crew-portals en gedownloade PDF's, die
-- geen ingelogde Supabase-sessie hebben. Pad-conventie: {owner_user_id}/... zodat de
-- policy hieronder kan controleren of de ingelogde gebruiker bij die organisatie hoort.
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

drop policy if exists "team manage org-logos" on storage.objects;
create policy "team manage org-logos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_team_member(((storage.foldername(storage.objects.name))[1])::uuid)
  )
  with check (
    bucket_id = 'org-logos'
    and public.is_team_member(((storage.foldername(storage.objects.name))[1])::uuid)
  );

-- Audit log: alleen leesbaar voor het team, geschreven via de service-role client vanuit
-- server actions (zelfde patroon als activity_log/logActivity) — geen insert-policy nodig.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_label text not null,
  action text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_log_owner_user_id_idx on public.audit_log(owner_user_id);

alter table public.audit_log enable row level security;

drop policy if exists "team can view audit_log" on public.audit_log;
create policy "team can view audit_log" on public.audit_log
  for select using (public.is_team_member(owner_user_id));
