-- Projectbreed klantbudget + standaardmarge, zodat Fase 1 een realistisch beeld kan geven
-- (incl. marge, niet alleen inkoop) van waar het project staat t.o.v. het budget dat de klant
-- heeft opgegeven.
alter table public.projects add column if not exists client_budget numeric;
alter table public.projects add column if not exists default_margin_percentage numeric not null default 20;
