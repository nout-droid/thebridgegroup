import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Privacyverklaring — The Bridge Group B.V.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          Privacyverklaring
        </h1>
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Dit is een conceptversie op basis van een standaard SaaS-sjabloon. Laat deze tekst
          controleren door een jurist voordat je 'm als definitief beschouwt.
        </p>
        <p className="text-sm text-muted-foreground">Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}</p>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">1. Wie is verantwoordelijk</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Bridge Group B.V. (KvK 95160272), gevestigd in Rotterdam, is verwerkingsverantwoordelijke
            voor de accountgegevens van organisaties die een abonnement afsluiten. Voor gegevens die een
            organisatie zelf invoert over haar projecten, klanten, leveranciers, crew en gasten treden wij
            op als verwerker: de organisatie zelf blijft verwerkingsverantwoordelijke voor die gegevens.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">2. Welke gegevens verzamelen we</h2>
          <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>Accountgegevens: naam, e-mailadres, bedrijfsnaam, wachtwoord (gehasht).</li>
            <li>Betaalgegevens: verwerkt en opgeslagen door Stripe, niet door ons zelf.</li>
            <li>
              Projectgegevens die de organisatie zelf invoert: begrotingen, draaiboeken,
              leveranciersinformatie, en persoonsgegevens van crew, gasten en klanten (zoals naam,
              e-mailadres, ID-nummer voor accreditatie) die nodig zijn voor de uitvoering van een
              evenement.
            </li>
            <li>Technische gegevens: IP-adres en basale gebruikslogs, voor beveiliging en foutopsporing.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">3. Doeleinden</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wij gebruiken deze gegevens om het Platform te leveren, abonnementen te beheren en
            factureren, gebruikers te ondersteunen, en het Platform te beveiligen en te verbeteren.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">4. Bewaartermijn</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Gegevens worden bewaard zolang het account actief is. Na opzegging en een redelijke
            overgangstermijn voor export kunnen gegevens op verzoek van de organisatie worden
            verwijderd via de Team-pagina in het Platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">5. Delen met derden</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Voor de werking van het Platform maken we gebruik van een beperkt aantal
            verwerkers: Supabase (database en bestandsopslag), Stripe (betalingen), en Resend/DeepL
            (respectievelijk e-mailverzending en vertalingen, alleen indien geactiveerd). Met elk van
            deze partijen zijn passende afspraken over gegevensverwerking van toepassing. Wij
            verkopen geen gegevens aan derden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">6. Jouw rechten</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Je hebt recht op inzage, correctie en verwijdering van je gegevens, en op
            dataportabiliteit. Een organisatie-eigenaar kan dit direct zelf regelen via de
            Team-pagina (gegevensexport en accountverwijdering). Betrokkenen wiens gegevens door een
            organisatie zijn ingevoerd (bijvoorbeeld crew of gasten) kunnen contact opnemen met die
            organisatie, of met ons als dat niet mogelijk is. Klachten kun je ook indienen bij de
            Autoriteit Persoonsgegevens.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">7. Beveiliging</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Toegang tot gegevens is beveiligd met wachtwoorden en, waar van toepassing,
            token-gebaseerde toegang per project. We passen rijniveaubeveiliging (row-level
            security) toe zodat organisaties uitsluitend bij hun eigen gegevens kunnen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">8. Cookies</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Het Platform gebruikt uitsluitend functionele cookies (voor inloggen en taalvoorkeur) —
            geen tracking- of advertentiecookies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">9. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vragen over deze privacyverklaring? Neem contact op via onze{" "}
            <a href="https://thebridgeavgroup.com/contact" className="underline">
              contactpagina
            </a>
            . Zie ook onze{" "}
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
