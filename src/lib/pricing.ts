// Prijsmodel: per-gebruiker (seat-based), zodat de kosten meeschalen met de teamgrootte i.p.v.
// één vaste prijs per organisatie. Vergeleken met direct concurrerende AV/event-productie-
// planningstools (Rentman, Current RMS: doorgaans €35-90 per gebruiker/maand, geen gratis-
// tier) en generieke per-seat projectmanagementtools als richtlijn voor een marktconforme
// prijs, met een volumekorting vanaf 4 gebruikers om groei te belonen. Enterprise (16+) heeft
// geen self-serve prijs — altijd maatwerk/contact, zoals gebruikelijk bij vergelijkbare tools.
export type PricingTierKey = "starter" | "team" | "enterprise";

export interface PricingTier {
  key: PricingTierKey;
  minSeats: number;
  maxSeats: number | null;
  pricePerSeat: number | null; // in euro, per maand — null = op aanvraag (enterprise)
  priceEnvVar: string | null; // Stripe Price ID env var, null = geen self-serve checkout
  defaultSeats: number;
}

export const PRICING_TIERS: Record<PricingTierKey, PricingTier> = {
  starter: {
    key: "starter",
    minSeats: 1,
    maxSeats: 3,
    pricePerSeat: 49,
    priceEnvVar: "STRIPE_PRICE_ID_STARTER",
    defaultSeats: 2,
  },
  team: {
    key: "team",
    minSeats: 4,
    maxSeats: 15,
    pricePerSeat: 39,
    priceEnvVar: "STRIPE_PRICE_ID_TEAM",
    defaultSeats: 6,
  },
  enterprise: {
    key: "enterprise",
    minSeats: 16,
    maxSeats: null,
    pricePerSeat: null,
    priceEnvVar: null,
    defaultSeats: 16,
  },
};

export function tierForSeatCount(seats: number): PricingTierKey {
  if (seats >= PRICING_TIERS.enterprise.minSeats) return "enterprise";
  if (seats >= PRICING_TIERS.team.minSeats) return "team";
  return "starter";
}
