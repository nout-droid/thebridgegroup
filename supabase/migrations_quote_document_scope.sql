-- Leveranciers kunnen straks één offerte-PDF per project uploaden i.p.v. per categorie.
-- quote_documents kan daarom óf aan één offerte hangen (bestaand) óf los aan een
-- project+leverancier ("nog te splitsen"). Voer dit één keer uit in de Supabase SQL Editor.

alter table public.quote_documents alter column quote_id drop not null;
alter table public.quote_documents add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.quote_documents add column if not exists supplier_id uuid references public.suppliers(id) on delete cascade;

create index if not exists quote_documents_project_supplier_idx on public.quote_documents(project_id, supplier_id);

alter table public.quote_documents drop constraint if exists quote_documents_scope_check;
alter table public.quote_documents add constraint quote_documents_scope_check
  check (
    (quote_id is not null and project_id is null and supplier_id is null)
    or (quote_id is null and project_id is not null and supplier_id is not null)
  );

drop policy if exists "owner full access on quote_documents" on public.quote_documents;
create policy "owner full access on quote_documents" on public.quote_documents
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.has_project_access(p.id)
    )
    or exists (
      select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id)
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and public.has_project_access(p.id)
    )
    or exists (
      select 1 from public.projects p where p.id = project_id and public.has_project_access(p.id)
    )
  );
