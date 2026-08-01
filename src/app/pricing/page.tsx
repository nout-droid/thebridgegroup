import Image from "next/image";
import Link from "next/link";
import {
  Wallet,
  Radio as RadioIcon,
  Wrench,
  Users,
  FileText,
  HardHat,
  Hotel,
  UtensilsCrossed,
  Plane,
  Zap,
  QrCode,
  Languages,
  Palette,
  CalendarDays,
  ShieldCheck,
  Building2,
} from "lucide-react";
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

const QUICK_FEATURES = [
  { icon: Wallet, label: "Budgeting & Quotes" },
  { icon: RadioIcon, label: "Live Show Rundown" },
  { icon: HardHat, label: "Full Production Planning" },
  { icon: Users, label: "Client & Supplier Portals" },
  { icon: Palette, label: "White-Label Documents" },
  { icon: Languages, label: "English & Dutch" },
];

const PILLARS = [
  {
    icon: Wallet,
    image: "/screenshots/budgeting.png",
    title: "Budgeting & Supplier Sourcing",
    lead:
      "Build a watertight budget by category, invite the right suppliers, and never lose track of margin.",
    points: [
      "Category-based budgets with live margin tracking as quotes come in",
      "Invite a supplier to quote on multiple categories in one bulk request",
      "Upload a supplier's PDF quote and have it auto-matched to your catalog and split by category",
      "Client budget approval built in — no more email chains to get a green light",
      "One-click, branded client invoice / quote export",
    ],
  },
  {
    icon: HardHat,
    image: "/screenshots/production.png",
    title: "Full Production Planning — Every Department",
    lead:
      "Everything a technical producer juggles across spreadsheets, WhatsApp groups and email — in one place, per event, per stage, per day.",
    points: [
      "Equipment & machinery: track every reservation by area, date and supplier, with automatic distribution-board and switch calculations for lighting",
      "Catering: orders per day and area, automatic headcounts and daily totals",
      "Hotel & flights: bookings overview, flight-needed flags, and per-person travel requests",
      "Comms & radios: channel assignments per person and area",
      "Power: requests and load per area",
      "Crew & accreditation: planning, positions, access dates, QR-code badges with live check-in",
      "Artist & technical riders, plus a running list of open questions so nothing falls through the cracks",
      "A reusable venue catalog — power, loading dock access, dimensions, rigging and Wi-Fi captured once and reused every time a venue gets rebooked",
    ],
  },
  {
    icon: RadioIcon,
    image: "/screenshots/rundown.png",
    title: "Live Show Rundown & Show-Calling",
    lead: "The moment doors open, everyone — from showcaller to stage crew — is looking at the exact same cue.",
    points: [
      "Real-time shared running order, updated instantly for every connected device",
      "Per-department instructions on every cue, so lighting, audio and stage crew each see only what's relevant to them",
      "A shared popup countdown clock and live chat per rundown",
      "Multi-day and multi-stage support, with showcaller control scoped per stage",
    ],
  },
  {
    icon: Users,
    image: "/screenshots/portals.png",
    title: "A Portal for Every Stakeholder",
    lead:
      "Clients, suppliers, crew, guests and showcallers each get a portal built exactly for their role — in their own language.",
    points: [
      "Client portal: live budget status, production plan and rider, plus direct requests and budget approval",
      "Supplier portal: exactly which categories they're asked to quote on, document uploads, and production requests",
      "Crew & showcaller portals: the live rundown, notes, and per-stage access",
      "Guest portal: accreditation document uploads ahead of the event, with QR badge check-in on-site",
      "Every portal and the entire app switches instantly between English and Dutch",
    ],
  },
  {
    icon: FileText,
    title: "Documents, Branding & Oversight",
    lead: "Turn live production data into polished, on-brand paperwork — and keep a full trail of who did what.",
    points: [
      "Every module exports a clean PDF: riders, callsheets, schedules, invoices, badges — combine them all into one master production book",
      "Add your logo and brand color once — every portal and every downloaded PDF carries your identity, not ours",
      "A shared calendar across all projects with automatic supplier and crew conflict warnings",
      "A full audit log of sensitive actions, and per-project access control for your team",
    ],
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
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
            The Bridge Production OS
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            Budgeting. Rundown. Equipment, catering, hotels, flights, comms and power. Client,
            supplier, crew and guest portals. Everything a technical producer needs to run an
            event — in one system, instead of a dozen spreadsheets and email threads.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black hover:opacity-90"
            >
              Start free trial
            </Link>
            <a
              href="#pricing"
              className="rounded-md border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
            >
              See pricing
            </a>
          </div>
        </div>

        {/* Quick feature strip */}
        <div className="mb-20 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-5 text-center"
            >
              <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</span>
            </div>
          ))}
        </div>

        {/* Pillars */}
        <div className="mb-20 space-y-16">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            const reversed = i % 2 === 1;
            return (
              <div
                key={pillar.title}
                className={`flex flex-col items-center gap-8 lg:flex-row ${reversed ? "lg:flex-row-reverse" : ""}`}
              >
                <div className="flex w-full flex-1 flex-col justify-center">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                      <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
                    </div>
                    <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
                      {pillar.title}
                    </h2>
                  </div>
                  <p className="mb-4 text-white/60">{pillar.lead}</p>
                  <ul className="space-y-2.5 text-sm text-white/80">
                    {pillar.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex w-full flex-1 items-center justify-center">
                  {pillar.image ? (
                    <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/40">
                      <img
                        src={pillar.image}
                        alt={`${pillar.title} in The Bridge Production OS`}
                        className="h-72 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="grid aspect-video w-full max-w-md place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent">
                      <Icon className="h-16 w-16 text-white/10" strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary feature row */}
        <div className="mb-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Hotel, label: "Hotel bookings" },
            { icon: Plane, label: "Flight requests" },
            { icon: UtensilsCrossed, label: "Catering orders" },
            { icon: Zap, label: "Power requests" },
            { icon: QrCode, label: "QR badge check-in" },
            { icon: CalendarDays, label: "Conflict detection" },
            { icon: ShieldCheck, label: "Audit log" },
            { icon: Wrench, label: "Equipment reservations" },
            { icon: Building2, label: "Venue catalog" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
              <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
              <span className="text-xs text-white/70">{label}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div id="pricing" className="scroll-mt-8">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-extrabold uppercase tracking-tight">Pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/60">
              Priced per user, so you only ever pay for your actual team size.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Trial */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-8">
              <h3 className="font-heading text-xl font-extrabold uppercase tracking-tight">Free Trial</h3>
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
              <h3 className="font-heading text-xl font-extrabold uppercase tracking-tight">Starter</h3>
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
              <h3 className="font-heading text-xl font-extrabold uppercase tracking-tight">Team</h3>
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
              <h3 className="font-heading text-xl font-extrabold uppercase tracking-tight">Enterprise</h3>
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
        </div>
      </main>

      <Footer variant="dark" />
    </div>
  );
}
