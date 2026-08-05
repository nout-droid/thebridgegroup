import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Cookiebeleid — The Bridge Group B.V.",
  robots: { index: false, follow: false },
};

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          Cookiebeleid
        </h1>
        <p className="text-sm text-muted-foreground">Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}</p>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">1. Welke cookies gebruiken we</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Het Platform gebruikt uitsluitend <strong>functionele cookies</strong> — geen tracking-,
            marketing- of advertentiecookies, en geen cookies van derden voor analytics of
            profilering. Omdat deze cookies strikt noodzakelijk zijn om het Platform te laten
            werken, is daarvoor geen toestemmingsbanner vereist onder de Telecommunicatiewet.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">2. Overzicht per categorie</h2>
          <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Inlogsessie (team):</strong> cookies van onze authenticatieleverancier Supabase,
              om je ingelogd te houden nadat je bent ingelogd op het Platform.
            </li>
            <li>
              <strong>Portaaltoegang:</strong> een los sessiecookie per rol — klant, leverancier,
              crew, showcaller, gast of attendee — zodra je inlogt op het bijbehorende portaal met
              een event-code, wachtwoord of gedeelde link. Dit cookie bevat geen persoonsgegevens,
              alleen een toegangstoken voor dat specifieke project.
            </li>
            <li>
              <strong>Taalvoorkeur:</strong> onthoudt of je de Nederlandse of Engelse versie van het
              Platform hebt gekozen.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">3. Bewaartermijn</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sessiecookies vervallen automatisch na een periode van inactiviteit of zodra je
            uitlogt. Geen van deze cookies wordt gebruikt om je gedrag op andere websites te volgen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">4. Cookies uitschakelen</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Je kunt cookies blokkeren via je browserinstellingen, maar omdat alle cookies hier
            functioneel zijn, werkt inloggen en het gebruik van het Platform dan niet meer.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">5. Meer informatie</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Zie ook onze{" "}
            <Link href="/privacy" className="underline">
              privacyverklaring
            </Link>{" "}
            voor hoe we overige gegevens verwerken, en onze{" "}
            <Link href="/terms" className="underline">
              algemene voorwaarden
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
