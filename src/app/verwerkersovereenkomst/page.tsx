import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Verwerkersovereenkomst — The Bridge Group B.V.",
  robots: { index: false, follow: false },
};

export default function DpaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          Verwerkersovereenkomst
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Deze verwerkersovereenkomst geeft invulling aan artikel 28 AVG voor de verwerking van
          persoonsgegevens die een Klant (verwerkingsverantwoordelijke) via het Platform aan The
          Bridge Group B.V. (verwerker) laat verwerken — bijvoorbeeld gegevens van crew, gasten,
          leveranciers en klantcontacten die de organisatie zelf invoert. Door een account aan te
          maken en het Platform te gebruiken, gaan Klant en The Bridge Group B.V. deze
          verwerkersovereenkomst aan; ze maakt onderdeel uit van onze{" "}
          <Link href="/terms" className="underline">
            algemene voorwaarden
          </Link>
          .
        </p>
        <p className="text-sm text-muted-foreground">Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}</p>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">1. Onderwerp en duur</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Bridge Group B.V. verwerkt persoonsgegevens uitsluitend in opdracht van en ten
            behoeve van de Klant, voor de duur van het abonnement, en uitsluitend voor het leveren
            van het Platform zoals beschreven in de algemene voorwaarden. Deze overeenkomst eindigt
            van rechtswege bij beëindiging van het abonnement, met inachtneming van de
            bewaartermijn voor export in artikel 4.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">2. Aard en doel van de verwerking</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            De verwerking betreft de opslag, weergave en verwerking van gegevens die de Klant zelf
            invoert in het Platform: naam, e-mailadres en (waar van toepassing) ID-nummer van crew
            en genodigden voor accreditatie, contactgegevens van leveranciers en klanten,
            begrotingen en productieplanningen. Categorieën betrokkenen: medewerkers en
            vertegenwoordigers van de Klant, crew, freelancers, leveranciers, gasten/attendees en
            klantcontacten van de Klant.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">3. Subverwerkers</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            De Klant geeft algemene toestemming voor het inschakelen van de volgende subverwerkers:
            Supabase (database en bestandsopslag, EU-regio), Vercel (hosting), Stripe (betalingen,
            alleen voor accountgegevens van de Klant zelf), en optioneel — alleen indien de Klant of
            wij dit activeren — Resend (e-mailverzending) en DeepL (vertalingen). Wij informeren de
            Klant bij wijziging van deze lijst en bieden gelegenheid tot bezwaar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">4. Bewaartermijn en verwijdering</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Gegevens worden bewaard zolang het account actief is. Na beëindiging kan de Klant een
            volledige export opvragen en het account laten verwijderen via de Team-pagina in het
            Platform; na verwijdering worden de gegevens binnen een redelijke termijn definitief
            gewist, behoudens een wettelijke bewaarplicht.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">5. Beveiligingsmaatregelen</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Toegang tot gegevens is beveiligd met wachtwoorden en, waar van toepassing,
            token-gebaseerde toegang per project. Wij passen row-level security toe zodat elke
            organisatie uitsluitend bij haar eigen gegevens kan, versleutelen verkeer via TLS, en
            houden een logboek bij van gevoelige acties (zie de Team-pagina in het Platform).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">6. Meldplicht datalekken</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Bij een beveiligingsincident dat leidt tot een datalek informeren wij de Klant zonder
            onredelijke vertraging, zodat de Klant zo nodig zelf kan melden bij de Autoriteit
            Persoonsgegevens en betrokkenen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">7. Bijstand en audits</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wij verlenen redelijke medewerking aan verzoeken van betrokkenen (inzage, correctie,
            verwijdering) die de Klant ontvangt, en aan een AVG-conformiteitscontrole door of namens
            de Klant, mits vooraf schriftelijk aangekondigd en binnen kantoortijden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">8. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Bridge Group B.V. — Rotterdam, Nederland. KvK 95160272, BTW NL867024537B01. Vragen
            over deze verwerkersovereenkomst kun je stellen via de contactpagina op onze website.
            Zie ook onze{" "}
            <Link href="/privacy" className="underline">
              privacyverklaring
            </Link>{" "}
            en{" "}
            <Link href="/cookies" className="underline">
              cookiebeleid
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
