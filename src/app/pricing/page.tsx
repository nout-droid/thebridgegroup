import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { TRIAL_PROJECT_LIMIT } from "@/lib/server/subscription";
import { PRICING_TIERS } from "@/lib/pricing";
import { SeatCalculator } from "./seat-calculator";

const SALES_EMAIL = "sales@thebridgeavgroup.com";

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
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight">Prijzen</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            Eén platform voor je hele productie — begroting, draaiboek, leveranciers- en
            klantcommunicatie. Prijs per gebruiker, zodat je alleen betaalt voor je daadwerkelijke
            teamgrootte.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Proefperiode */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Proefperiode</h2>
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

          {/* Starter */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Starter</h2>
            <p className="mt-1 text-3xl font-bold">&euro; {starter.pricePerSeat}</p>
            <p className="text-sm text-white/50">per gebruiker / maand, excl. btw</p>
            <p className="mt-1 text-xs text-white/40">Voor kleine teams (1-3 gebruikers)</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Alles uit de proefperiode</li>
              <li>Onbeperkt projecten</li>
              <li>Klant-, leveranciers-, crew- en showcaller-portals</li>
              <li>E-mailsupport</li>
            </ul>
            <div className="mt-8">
              <SeatCalculator
                tier="starter"
                pricePerSeat={starter.pricePerSeat}
                minSeats={starter.minSeats}
                maxSeats={starter.maxSeats}
                defaultSeats={starter.defaultSeats}
                checkoutEnabled={isStripeConfigured}
                startLabel="Start abonnement"
                perSeatLabel="Aantal gebruikers"
                totalLabel="Totaal:"
              />
            </div>
          </div>

          {/* Team */}
          <div className="flex flex-col rounded-xl border-2 border-primary bg-white/5 p-8">
            <span className="mb-2 inline-block w-fit rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Meest gekozen
            </span>
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Team</h2>
            <p className="mt-1 text-3xl font-bold">&euro; {team.pricePerSeat}</p>
            <p className="text-sm text-white/50">per gebruiker / maand, excl. btw</p>
            <p className="mt-1 text-xs text-white/40">Voor groeiende teams (4-15 gebruikers)</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
              <li>Alles uit Starter</li>
              <li>Volumekorting per gebruiker</li>
              <li>Onbeperkt klantaccounts</li>
              <li>Prioriteit bij support</li>
            </ul>
            <div className="mt-8">
              <SeatCalculator
                tier="team"
                pricePerSeat={team.pricePerSeat}
                minSeats={team.minSeats}
                maxSeats={team.maxSeats}
                defaultSeats={team.defaultSeats}
                checkoutEnabled={isStripeConfigured}
                startLabel="Start abonnement"
                perSeatLabel="Aantal gebruikers"
                totalLabel="Totaal:"
              />
            </div>
          </div>
        </div>

        {/* Enterprise */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-8 sm:flex-row">
          <div>
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">Enterprise</h2>
            <p className="mt-1 text-sm text-white/60">
              16+ gebruikers, meerdere vestigingen of maatwerkwensen (SSO, dedicated onboarding,
              eigen huisstijl op alle documenten). Prijs op aanvraag.
            </p>
          </div>
          <a
            href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Enterprise-abonnement")}`}
            className="shrink-0 rounded-md border border-white/20 px-5 py-2.5 text-center text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
          >
            Neem contact op
          </a>
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
