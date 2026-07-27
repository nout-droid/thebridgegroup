import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe niet geconfigureerd" }, { status: 503 });
  }

  const stripe = getStripeClient()!;
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Ongeldige signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const ownerUserId = session.metadata?.owner_user_id;
    if (ownerUserId) {
      await admin
        .from("organizations")
        .update({
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_subscription_id:
            typeof session.subscription === "string" ? session.subscription : null,
          subscription_status: "active",
          plan: "pro",
        })
        .eq("owner_user_id", ownerUserId);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const ownerUserId = subscription.metadata?.owner_user_id;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
    if (ownerUserId) {
      await admin
        .from("organizations")
        .update({ subscription_status: status })
        .eq("owner_user_id", ownerUserId);
    } else {
      await admin
        .from("organizations")
        .update({ subscription_status: status })
        .eq("stripe_customer_id", subscription.customer as string);
    }
  }

  return NextResponse.json({ received: true });
}
