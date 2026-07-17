-- Matching-geheugen: onthoud bevestigde koppelingen tussen een omschrijving en een catalogusartikel,
-- zodat dezelfde omschrijving bij een volgende materiaallijst/offerte-import automatisch herkend wordt.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

create table if not exists public.article_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  article_id uuid not null references public.catalog_articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, raw_text)
);

create index if not exists article_aliases_user_id_idx on public.article_aliases(user_id);

alter table public.article_aliases enable row level security;

drop policy if exists "owner full access on article_aliases" on public.article_aliases;
create policy "owner full access on article_aliases" on public.article_aliases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
