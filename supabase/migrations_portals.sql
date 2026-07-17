-- Leveranciers- en gastenportaal (met versiegeschiedenis van geuploade documenten).
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

-- ========== LEVERANCIER PORTAAL-LOGIN ==========

alter table public.suppliers add column if not exists portal_code text;
alter table public.suppliers add column if not exists portal_password_hash text;

create unique index if not exists suppliers_portal_code_idx on public.suppliers (portal_code)
  where portal_code is not null;

create or replace function public.verify_supplier_login(p_portal_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select id from public.suppliers
  where upper(portal_code) = upper(p_portal_code)
    and portal_password_hash is not null
    and portal_password_hash = crypt(p_password, portal_password_hash)
  limit 1;
$$;

grant execute on function public.verify_supplier_login(text, text) to anon;

create or replace function public.set_supplier_password(p_supplier_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.suppliers
  set portal_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_supplier_id;
$$;

grant execute on function public.set_supplier_password(uuid, text) to authenticated;

-- ========== OFFERTE-DOCUMENTEN (versiegeschiedenis, append-only) ==========

create table if not exists public.quote_documents (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  uploaded_by text not null check (uploaded_by in ('owner', 'supplier')),
  storage_path text not null,
  original_filename text not null default '',
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quote_documents_quote_id_idx on public.quote_documents(quote_id);

alter table public.quote_documents enable row level security;

-- Eigenaar (Nout) mag alles zien/beheren via de bestaande project-keten.
drop policy if exists "owner full access on quote_documents" on public.quote_documents;
create policy "owner full access on quote_documents" on public.quote_documents
  for all using (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quotes q
      join public.categories c on c.id = q.category_id
      join public.projects p on p.id = c.project_id
      where q.id = quote_id and p.user_id = auth.uid()
    )
  );

-- Leveranciers hebben geen Supabase-sessie (eigen cookie-login), dus schrijven/lezen namens
-- hen loopt via de service-role client in de app, ná een eigen autorisatie-check in Next.js.
-- Daarom bewust geen extra RLS-policy voor "supplier"-toegang hier.

-- ========== GASTEN PORTAAL-LOGIN + DOCUMENTEN ==========

alter table public.projects add column if not exists guest_password_hash text;

create or replace function public.verify_guest_login(p_event_code text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
stable
as $$
  select share_token from public.projects
  where upper(event_code) = upper(p_event_code)
    and guest_password_hash is not null
    and guest_password_hash = crypt(p_password, guest_password_hash)
  limit 1;
$$;

grant execute on function public.verify_guest_login(text, text) to anon;

create or replace function public.set_guest_password(p_project_id uuid, p_password text)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  update public.projects
  set guest_password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_project_id;
$$;

grant execute on function public.set_guest_password(uuid, text) to authenticated;

create table if not exists public.guest_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  storage_path text not null,
  original_filename text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists guest_documents_project_id_idx on public.guest_documents(project_id);

alter table public.guest_documents enable row level security;

drop policy if exists "owner full access on guest_documents" on public.guest_documents;
create policy "owner full access on guest_documents" on public.guest_documents
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ========== PRIVATE STORAGE BUCKET ==========
-- Niet public: downloads voor leveranciers/gasten lopen via server-side signed URLs
-- (service-role client), na een eigen autorisatie-check in de Next.js server actions.

insert into storage.buckets (id, name, public)
values ('portal-documents', 'portal-documents', false)
on conflict (id) do nothing;

drop policy if exists "owner access portal-documents" on storage.objects;
create policy "owner access portal-documents" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'portal-documents'
    and (
      exists (
        select 1 from public.quotes q
        join public.categories c on c.id = q.category_id
        join public.projects p on p.id = c.project_id
        where q.id::text = (storage.foldername(storage.objects.name))[2] and p.user_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(storage.objects.name))[2] and p.user_id = auth.uid()
      )
    )
  );
