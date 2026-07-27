import Stripe from "stripe";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

// Geeft null terug zolang STRIPE_SECRET_KEY niet is ingesteld — de billing-routes checken
// isStripeConfigured en laten de gebruiker weten dat abonnementen nog niet actief zijn,
// i.p.v. te crashen op een ontbrekende key (zelfde patroon als de Resend/DeepL-integraties).
export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
