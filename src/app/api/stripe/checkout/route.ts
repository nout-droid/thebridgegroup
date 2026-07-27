import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  if (!isStripeConfigured || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.redirect(
      `${origin}/team?error=${encodeURIComponent("Abonnementen zijn nog niet actief — STRIPE_SECRET_KEY/STRIPE_PRICE_ID ontbreken.")}`
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
    .select("*")
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (!organization) return NextResponse.redirect(`${origin}/team`);

  const stripe = getStripeClient()!;
  const { data: ownerAuthUser } = await admin.auth.admin.getUserById(ownerId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer: organization.stripe_customer_id ?? undefined,
    customer_email: organization.stripe_customer_id ? undefined : ownerAuthUser?.user?.email ?? undefined,
    success_url: `${origin}/team?checkout=success`,
    cancel_url: `${origin}/team?checkout=cancelled`,
    metadata: { owner_user_id: ownerId },
    subscription_data: { metadata: { owner_user_id: ownerId } },
  });

  return NextResponse.redirect(session.url ?? `${origin}/team`);
}
