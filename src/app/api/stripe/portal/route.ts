import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  if (!isStripeConfigured) {
    return NextResponse.redirect(
      `${origin}/team?error=${encodeURIComponent("Abonnementen zijn nog niet actief — STRIPE_SECRET_KEY ontbreekt.")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const admin = createAdminClient();
  const { data: organization } = await admin
    .from("organizations")
    .select("stripe_customer_id")
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (!organization?.stripe_customer_id) {
    return NextResponse.redirect(
      `${origin}/team?error=${encodeURIComponent("Nog geen actief Stripe-klantprofiel gevonden — sluit eerst een abonnement af.")}`
    );
  }

  const stripe = getStripeClient()!;
  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: `${origin}/team`,
  });

  return NextResponse.redirect(session.url);
}
