-- Leveranciers-korting: prijslijsten zijn bruto, Nout krijgt een vast kortingspercentage.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.suppliers add column if not exists default_discount_percentage numeric not null default 0;

-- Netto catalogusprijzen (bruto dagprijs minus leverancierskorting). RLS van de onderliggende
-- tabellen blijft gelden dankzij security_invoker, dus deze view lekt geen data tussen gebruikers.
create or replace view public.catalog_articles_net
with (security_invoker = true) as
select
  ca.id,
  ca.supplier_id,
  s.name as supplier_name,
  ca.external_code,
  ca.name,
  ca.category,
  ca.properties,
  round(ca.day_price * (1 - s.default_discount_percentage / 100), 2) as day_price,
  ca.unit,
  ca.created_at
from public.catalog_articles ca
join public.suppliers s on s.id = ca.supplier_id;

-- suggest_catalog_matches gebruikt nu de netto-prijs view i.p.v. de ruwe (bruto) tabel.
create or replace function public.suggest_catalog_matches(p_description text, p_limit int default 5)
returns table (
  article_id uuid,
  supplier_id uuid,
  supplier_name text,
  name text,
  category text,
  day_price numeric,
  similarity real
)
language sql
security invoker
stable
as $$
  select ca.id, ca.supplier_id, ca.supplier_name, ca.name, ca.category, ca.day_price,
         similarity(ca.name, p_description) as similarity
  from public.catalog_articles_net ca
  where ca.name % p_description
  order by similarity desc
  limit p_limit;
$$;

grant execute on function public.suggest_catalog_matches(text, int) to authenticated;
