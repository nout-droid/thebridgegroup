-- Dag-specifieke toegang voor crew/accreditatie, en leverancier-herkomst voor catering + comms.
-- Voer dit één keer uit in de Supabase SQL Editor, ná de eerdere migraties.

alter table public.crew_members add column if not exists access_dates date[] not null default '{}';

alter table public.catering_orders add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.comms_assignments add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists catering_orders_supplier_id_idx on public.catering_orders(supplier_id);
create index if not exists comms_assignments_supplier_id_idx on public.comms_assignments(supplier_id);
