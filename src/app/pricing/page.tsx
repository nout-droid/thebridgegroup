import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { TRIAL_PROJECT_LIMIT } from "@/lib/server/subscription";
import { PRICING_TIERS } from "@/lib/pricing";
import { SeatCalculator } from "./seat-calculator";

const SALES_EMAIL = "order@thebridgeavgroup.com";

async function getLivePricePerSeat(envVar: string | null): Promise<number | null> {
  if (!envVar || !isStripeConfigured || !process.env[envVar]) return null;
  try {
    const stripe = getStripeClient()!;
    const price = await stripe.prices.retrieve(process.env[envVar]!);
    if (price.unit_amount == null) return null;
    return price.unit_amount / 100;
  } catch {
    return null;
  }
}

const FEATURES = [
  {
    title: "Budgeting & Quotes",
    description:
      "Build a detailed budget by category, invite suppliers to quote — even for multiple categories at once — and track margin in real time as quotes come in.",
  },
  {
    title: "Live Show Rundown",
    description:
      "A real-time running order shared between showcaller, crew and stage management, with per-department instructions and a shared countdown clock.",
  },
  {
    title: "Client Portal",
    description:
      "Clients see live budget status, production plan, and rider — and can approve budgets or raise requests directly, without an email thread.",
  },
  {
    title: "Supplier Portal",
    description:
      "Suppliers see exactly which categories they've been asked to quote on, upload documents, and respond to production requests in one place.",
  },
  {
    title: "Crew, Guests & Accreditation",
    description:
      "Manage crew planning, access dates and positions, guest lists, and QR-code badge check-in for load-in, show and load-out.",
  },
  {
    title: "Production Documents",
    description:
      "Auto-generated riders, callsheets, schedules and invoices as polished PDFs — pulled straight from your live production data.",
  },
  {
    title: "Your Own Branding",
    description:
      "Add your logo and brand color once — every portal, client-facing page and downloaded PDF carries your identity instead of ours.",
  },
  {
    title: "Built-in Translation",
    description:
      "The entire app and every portal is available in English and Dutch, so international crews and suppliers always see it in their own language.",
  },
];

export default async function PricingPage() {
  const [starterPrice, teamPrice] = await Promise.all([
    getLivePricePerSeat(PRICING_TIERS.starter.priceEnvVar),
    getLivePricePerSeat(PRICING_TIERS.team.priceEnvVar),
  ]);

  const starter = { ...PRICING_TIERS.starter, pricePerSeat: starterPrice ?? PRICING_TIERS.starter.pricePerSeat! };
  const team = { ...PRICING_TIERS.team, pricePerSeat: teamPrice ?? PRICING_TIERS.team.pricePerSeat! };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-center gap-2 px-6 py-6">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={32} height={24} />
        <span className="font-heading text-lg font-extrabold uppercase tracking-tight text-primary">
          The Bridge Group B.V.
        </span>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
        <div className="mb-16 text-center">
          <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
            The Bridge Production Platform
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            One platform for your entire production — budgeting, show-calling, and supplier and
            client collaboration, all in one place. Priced per user, so you only ever pay for
            your actual team size.
          </p>
        </div>

        {/* What you get */}
        <div className="mb-16">
          <h2 className="mb-6 text-center font-heading text-sm font-extrabold uppercase tracking-widest text-white/40">
            What you get
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-heading text-sm font-extrabold uppercase tracking-tight text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Trial */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Free Trial</h2>
            <p className="mt-1 text-3xl font-bold">Free</p>
            <p className="text-sm text-white/50">30 days, no credit card required</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Up to {TRIAL_PROJECT_LIMIT} projects</li>
              <li>Full budgeting, rundown and production modules</li>
              <li>Client, supplier, crew and showcaller portals</li>
              <li>Invite team members</li>
            </ul>
            <Link
              href="/signup"
              className="mt-8 rounded-md border border-white/20 px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
            >
              Start free trial
            </Link>
          </div>

          {/* Starter */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Starter</h2>
            <p className="mt-1 text-3xl font-bold">&euro; {starter.pricePerSeat}</p>
            <p className="text-sm text-white/50">per user / month, excl. VAT</p>
            <p className="mt-1 text-xs text-white/40">For small teams (1-3 users)</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Everything in the free trial</li>
              <li>Unlimited projects</li>
              <li>Client, supplier, crew and showcaller portals</li>
              <li>Email support</li>
            </ul>
            <div className="mt-8">
              <SeatCalculator
                tier="starter"
                pricePerSeat={starter.pricePerSeat}
                minSeats={starter.minSeats}
                maxSeats={starter.maxSeats}
                defaultSeats={starter.defaultSeats}
                checkoutEnabled={isStripeConfigured}
                startLabel="Start subscription"
                perSeatLabel="Number of users"
                totalLabel="Total:"
              />
            </div>
          </div>

          {/* Team */}
          <div className="flex flex-col rounded-xl border-2 border-primary bg-white/5 p-8">
            <span className="mb-2 inline-block w-fit rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Most popular
            </span>
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Team</h2>
            <p className="mt-1 text-3xl font-bold">&euro; {team.pricePerSeat}</p>
            <p className="text-sm text-white/50">per user / month, excl. VAT</p>
            <p className="mt-1 text-xs text-white/40">For growing teams (4-15 users)</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Everything in Starter</li>
              <li>Volume discount per user</li>
              <li>Unlimited client accounts</li>
              <li>Priority support</li>
            </ul>
            <div className="mt-8">
              <SeatCalculator
                tier="team"
                pricePerSeat={team.pricePerSeat}
                minSeats={team.minSeats}
                maxSeats={team.maxSeats}
                defaultSeats={team.defaultSeats}
                checkoutEnabled={isStripeConfigured}
                startLabel="Start subscription"
                perSeatLabel="Number of users"
                totalLabel="Total:"
              />
            </div>
          </div>
        </div>

        {/* Enterprise */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-8 sm:flex-row">
          <div>
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Enterprise</h2>
            <p className="mt-1 text-sm text-white/60">
              16+ users, multiple locations, or custom requirements (SSO, dedicated onboarding,
              your own branding on every document). Pricing on request.
            </p>
          </div>
          <a
            href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Enterprise plan")}`}
            className="shrink-0 rounded-md border border-white/20 px-5 py-2.5 text-center text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
          >
            Get in touch
          </a>
        </div>

        <p className="mt-10 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/login" className="underline-offset-4 hover:text-white hover:underline">
            Log in
          </Link>
        </p>
      </main>

      <Footer variant="dark" />
    </div>
  );
}
