-- article_aliases leert alleen raw_text -> catalogusartikel, en dat vereist een confident
-- match tegen een bestaand artikel. Veel offerteregels (stelposten, subcomponenten,
-- accessoires) matchen nooit een catalogusartikel en de gekozen categorie werd dus nooit
-- onthouden — de gebruiker moest telkens opnieuw handmatig de categorie kiezen. Deze tabel
-- leert raw_text -> categorie los van artikel-matching, zodat elke bevestigde regel voortaan
-- meetelt, ook zonder catalogus-match.
create table if not exists public.quote_line_category_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, raw_text)
);

create index if not exists quote_line_category_aliases_user_id_idx
  on public.quote_line_category_aliases(user_id);

alter table public.quote_line_category_aliases enable row level security;

drop policy if exists "team members can view quote_line_category_aliases" on public.quote_line_category_aliases;
create policy "team members can view quote_line_category_aliases" on public.quote_line_category_aliases
  for select using (public.is_team_member(user_id));
drop policy if exists "team members can insert quote_line_category_aliases" on public.quote_line_category_aliases;
create policy "team members can insert quote_line_category_aliases" on public.quote_line_category_aliases
  for insert with check (public.is_team_member(user_id));
drop policy if exists "team members can update quote_line_category_aliases" on public.quote_line_category_aliases;
create policy "team members can update quote_line_category_aliases" on public.quote_line_category_aliases
  for update using (public.is_team_member(user_id)) with check (public.is_team_member(user_id));
drop policy if exists "team admins can delete quote_line_category_aliases" on public.quote_line_category_aliases;
create policy "team admins can delete quote_line_category_aliases" on public.quote_line_category_aliases
  for delete using (public.is_team_admin(user_id));

grant select, insert, update, delete on public.quote_line_category_aliases to authenticated;
