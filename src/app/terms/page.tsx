import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Algemene voorwaarden — The Bridge Group B.V.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          Algemene voorwaarden
        </h1>
        <p className="text-sm text-muted-foreground">Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}</p>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">1. Definities</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            In deze voorwaarden wordt verstaan onder: <strong>&quot;wij&quot;/&quot;The Bridge Group
            B.V.&quot;</strong>: The Bridge Group B.V., aanbieder van het platform;{" "}
            <strong>&quot;Klant&quot;</strong>: de organisatie die een account afsluit;{" "}
            <strong>&quot;Platform&quot;</strong>: de software voor begroting, productieplanning en
            klant-/leveranciersportals die via dit domein wordt aangeboden;{" "}
            <strong>&quot;Gebruiker&quot;</strong>: iedere natuurlijke persoon die namens de Klant of
            een door de Klant uitgenodigde derde (leverancier, crew, gast) toegang heeft tot het
            Platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">2. Proefperiode en abonnementen</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nieuwe Klanten krijgen bij aanmelding een proefperiode van 30 dagen met een beperkt
            aantal projecten, zonder betaalverplichting. Na de proefperiode, of eerder op verzoek
            van de Klant, gaat een betaald abonnement in via onze betaalverwerker Stripe. Het
            abonnement wordt maandelijks of jaarlijks (afhankelijk van het gekozen plan)
            automatisch verlengd totdat de Klant opzegt via het Platform of via de Stripe
            klantomgeving. Prijzen staan vermeld op de{" "}
            <Link href="/pricing" className="underline">
              prijzenpagina
            </Link>{" "}
            en kunnen worden gewijzigd met inachtneming van een redelijke aankondigingstermijn.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">3. Gebruik van het Platform</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            De Klant is verantwoordelijk voor het gebruik van het Platform door haar Gebruikers,
            voor de juistheid van ingevoerde gegevens, en voor het zorgvuldig omgaan met
            inloggegevens die aan derden (leveranciers, crew, gasten, klanten) worden verstrekt. Het
            is niet toegestaan het Platform te gebruiken voor onrechtmatige doeleinden of op een
            manier die de beschikbaarheid voor andere Klanten verstoort.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">4. Gegevens van de Klant</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            De Klant blijft eigenaar van alle gegevens die zij in het Platform invoert (projecten,
            begrotingen, persoonsgegevens van crew/gasten/leveranciers). The Bridge Group B.V.
            treedt hierbij op als verwerker; zie onze{" "}
            <Link href="/privacy" className="underline">
              privacyverklaring
            </Link>{" "}
            voor details. De Klant kan op ieder moment een export van haar gegevens opvragen of
            haar account laten verwijderen via de Team-pagina in het Platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">5. Beschikbaarheid en aansprakelijkheid</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wij spannen ons in voor een goede beschikbaarheid van het Platform, maar geven geen
            garantie op ononderbroken werking. Onze aansprakelijkheid voor schade is beperkt tot het
            bedrag dat de Klant in de voorafgaande 12 maanden aan abonnementskosten heeft betaald,
            behoudens gevallen van opzet of grove schuld.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">6. Opzegging</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            De Klant kan het abonnement op ieder moment opzeggen via de Stripe-klantomgeving
            (bereikbaar via &quot;Abonnement beheren&quot; op de Team-pagina). Na opzegging blijft
            toegang bestaan tot het einde van de lopende betaalperiode; daarna wordt de toegang tot
            het aanmaken van nieuwe projecten geblokkeerd, maar blijven bestaande gegevens
            beschikbaar voor export gedurende een redelijke termijn.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">7. Wijzigingen</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wij kunnen deze voorwaarden wijzigen. Wezenlijke wijzigingen worden vooraf
            gecommuniceerd. Toepasselijk recht: Nederlands recht.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">8. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Bridge Group B.V. — Rotterdam, Nederland. KvK 95160272, BTW NL867024537B01. Vragen
            over deze voorwaarden kun je stellen via de contactpagina op onze website.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
