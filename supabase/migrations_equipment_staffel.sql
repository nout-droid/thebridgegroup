-- Eigen materiaal krijgt dezelfde huurperiode-staffel als de externe verhuurcatalogus i.p.v.
-- lineair per dag te rekenen: de dagprijs is het basistarief voor de eerste periode
-- (1-4 dagen), langere boekingen schalen op via rental_multiplier(). Zie
-- src/lib/server/equipment-cost.ts en src/app/equipment/page.tsx.

-- Losstaande bugfix, ontdekt tijdens het bouwen van de staffel-integratie hierboven: RLS
-- staat aan op rental_period_multipliers (buiten migrations_catalog.sql om ingeschakeld,
-- vermoedelijk via de dashboard-UI) maar had nooit een policy gekregen. Met RLS aan en
-- nul policies krijgt elke niet-owner rol (dus ook "authenticated", de rol die de app als
-- ingelogde gebruiker gebruikt) stilzwijgend nul rijen terug uit rental_multiplier()'s
-- subquery, waarna de coalesce(...,1) altijd op 1x uitkomt — dit trof dus niet alleen de
-- nieuwe materiaal-staffel maar ook de al langer bestaande offerte-PDF-import-staffel voor
-- de externe catalogus (pushMaterialListGroupToQuote in projects/[id]/actions.ts).
grant select on public.rental_period_multipliers to authenticated;

drop policy if exists "team members can view rental_period_multipliers" on public.rental_period_multipliers;
create policy "team members can view rental_period_multipliers" on public.rental_period_multipliers
  for select using (true);
