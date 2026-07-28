import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { PRICING_TIERS, type PricingTierKey } from "@/lib/pricing";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const tierParam = searchParams.get("tier");
  const tier = (tierParam && tierParam in PRICING_TIERS ? tierParam : null) as PricingTierKey | null;
  const seats = Math.max(1, parseInt(searchParams.get("seats") ?? "1", 10) || 1);

  if (!tier || !PRICING_TIERS[tier].priceEnvVar) {
    return NextResponse.redirect(`${origin}/pricing`);
  }

  const priceId = process.env[PRICING_TIERS[tier].priceEnvVar!];

  if (!isStripeConfigured || !priceId) {
    return NextResponse.redirect(
      `${origin}/team?error=${encodeURIComponent("Abonnementen zijn nog niet actief — STRIPE_SECRET_KEY/prijs-ID's ontbreken.")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?redirect=/pricing`);

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const admin = createAdminClient();
  const { data: organization } = await admin
    .from("organizations")
    .select("*")
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (!organization) return NextResponse.redirect(`${origin}/team`);

  const stripe = getStripeClient()!;
  const { data: ownerAuthUser } = await admin.auth.admin.getUserById(ownerId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: seats }],
    customer: organization.stripe_customer_id ?? undefined,
    customer_email: organization.stripe_customer_id ? undefined : ownerAuthUser?.user?.email ?? undefined,
    success_url: `${origin}/team?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata: { owner_user_id: ownerId, tier },
    subscription_data: { metadata: { owner_user_id: ownerId, tier } },
  });

  return NextResponse.redirect(session.url ?? `${origin}/team`);
}
