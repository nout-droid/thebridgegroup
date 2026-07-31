-- Werkelijke kosten (inkomende leveranciersfacturen) + lichte facturatie naar de klant.
-- Voer dit één keer uit in de Supabase SQL Editor, ná alle eerdere migraties.
--
-- Deel 1 — actual_costs: de eigenaar legt vast wat leveranciers daadwerkelijk factureren,
-- los van de begrote kosten (categories.manual_cost / gekozen offerte). Zo ontstaat een
-- begroot-vs-werkelijk vergelijking per categorie én projectbreed. Sommige werkelijke
-- kosten horen niet bij een categorie (algemene/overheadkosten) — category_id is daarom
-- nullable, met on delete set null zodat het verwijderen van een categorie de historie
-- van werkelijke kosten niet wegvaagt.
--
-- Deel 2 — lichte facturatie: de bestaande "Offerte downloaden (PDF)"-knop exporteerde tot
-- nu toe alleen een offerte zonder factuurnummer/-status. projects krijgt drie kolommen
-- zodat er een lichtgewicht factuurnummer, -datum en -status bijgehouden kan worden.

-- ========== ACTUAL COSTS (werkelijke/inkomende kosten) ==========

create table if not exists public.actual_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text not null,
  amount numeric not null,
  invoice_number text,
  invoice_date date,
  document_url text,
  created_at timestamptz not null default now()
);

create index if not exists actual_costs_project_id_idx on public.actual_costs(project_id);
create index if not exists actual_costs_category_id_idx on public.actual_costs(category_id);
create index if not exists actual_costs_supplier_id_idx on public.actual_costs(supplier_id);

alter table public.actual_costs enable row level security;

drop policy if exists "owner full access on actual_costs" on public.actual_costs;
create policy "owner full access on actual_costs" on public.actual_costs
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id))
  );

-- ========== LICHTE FACTURATIE (outgoing invoice naar de klant) ==========
-- Additief op de bestaande projects-tabel — geen aparte tabel nodig voor zoiets kleins.
-- invoice_status volgt de levenscyclus van de PDF-export op /projects/[id]/budget/invoice:
-- 'draft' (nog niet verstuurd) -> 'sent' (gedownload/verstuurd naar de klant) -> 'paid'.

alter table public.projects add column if not exists invoice_number text;
alter table public.projects add column if not exists invoice_status text not null default 'draft'
  check (invoice_status in ('draft', 'sent', 'paid'));
alter table public.projects add column if not exists invoice_date date;
