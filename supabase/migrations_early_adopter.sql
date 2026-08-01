-- ========== EARLY ADOPTER / BETA-AANBOD ==========
-- Zie src/lib/pricing.ts (EARLY_ADOPTER_MAX_SPOTS/EARLY_ADOPTER_COUPON_ENV_VAR) en
-- src/app/api/stripe/checkout/route.ts: 50% korting voor altijd, max 5 organisaties totaal.
-- Puur een boolean-vlag om de plekken-limiet te bewaken - de korting zelf verloopt via een
-- Stripe-coupon (duration "forever"), niet via herhaalde logica hier.
alter table public.organizations add column if not exists early_adopter boolean not null default false;
