import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { TRIAL_PROJECT_LIMIT } from "@/lib/server/subscription";

async function getProPriceLabel(): Promise<string | null> {
  if (!isStripeConfigured || !process.env.STRIPE_PRICE_ID) return null;
  try {
    const stripe = getStripeClient()!;
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    if (price.unit_amount == null || !price.currency) return null;
    const amount = (price.unit_amount / 100).toLocaleString("nl-NL", {
      style: "currency",
      currency: price.currency.toUpperCase(),
    });
    const interval = price.recurring?.interval === "year" ? "jaar" : "maand";
    return `${amount} / ${interval}`;
  } catch {
    return null;
  }
}

export default async function PricingPage() {
  const proPriceLabel = await getProPriceLabel();

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-center gap-2 px-6 py-6">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={32} height={24} />
        <span className="font-heading text-lg font-extrabold uppercase tracking-tight text-primary">
          The Bridge Group B.V.
        </span>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight">Prijzen</h1>
          <p className="mt-3 text-white/60">
            Eén platform voor je hele productie — begroting, draaiboek, leveranciers en klantcommunicatie.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="font-heading text-2xl font-extrabold uppercase tracking-tight">Proefperiode</h2>
            <p className="mt-1 text-3xl font-bold">Gratis</p>
            <p className="text-sm text-white/50">30 dagen, geen creditcard nodig</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Tot {TRIAL_PROJECT_LIMIT} projecten</li>
              <li>Volledige begroting, draaiboek en productiemodules</li>
              <li>Klant-, leveranciers-, crew- en showcaller-portals</li>
              <li>Teamleden uitnodigen</li>
            </ul>
            <Link
              href="/signup"
              className="mt-8 rounded-md border border-white/20 px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
            >
              Start gratis proefperiode
            </Link>
          </div>

          <div className="flex flex-col rounded-xl border-2 border-primary bg-white/5 p-8">
            <span className="mb-2 inline-block w-fit rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Meest gekozen
            </span>
            <h2 className="font-heading text-2xl font-extrabold uppercase tracking-tight">Pro</h2>
            <p className="mt-1 text-3xl font-bold">{proPriceLabel ?? "Op aanvraag"}</p>
            <p className="text-sm text-white/50">
              {proPriceLabel ? "excl. btw" : "Neem contact op voor een offerte op maat"}
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Onbeperkt projecten</li>
              <li>Alles uit de proefperiode</li>
              <li>Onbeperkt teamleden en klantaccounts</li>
              <li>Prioriteit bij support</li>
            </ul>
            <a
              href="/api/stripe/checkout"
              className="mt-8 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-black hover:opacity-90"
            >
              Start abonnement
            </a>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-white/40">
          Al een account?{" "}
          <Link href="/login" className="underline-offset-4 hover:text-white hover:underline">
            Log in
          </Link>
        </p>
      </main>

      <Footer variant="dark" />
    </div>
  );
}
