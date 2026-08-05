import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "User Guide — The Bridge Production OS",
};

const SECTIONS = [
  { id: "client", label: "Client Portal" },
  { id: "supplier", label: "Supplier Portal" },
  { id: "crew", label: "Crew Portal" },
  { id: "showcaller", label: "Showcaller Portal" },
  { id: "guest", label: "Guest Portal" },
];

export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-center gap-2 px-6 py-6">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={32} height={24} />
        <span className="font-heading text-lg font-extrabold uppercase tracking-tight text-primary">
          The Bridge Group B.V.
        </span>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        <div className="mb-10 text-center">
          <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight">User Guide</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            A short guide to every portal on The Bridge Production OS. Pick the portal that matches
            the login link you received.
          </p>
        </div>

        <nav className="mb-16 flex flex-wrap justify-center gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-white/10"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-16">
          {/* Client */}
          <section id="client" className="scroll-mt-8">
            <h2 className="mb-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
              Client Portal
            </h2>
            <p className="mb-5 text-white/60">
              For the client of an event: follow the budget, production plan and rider, and stay in
              touch with the production team.
            </p>
            <ol className="list-decimal space-y-4 pl-5 text-white/80">
              <li>
                <strong className="text-white">Logging in.</strong> If you were given an Event ID and
                password, log in at{" "}
                <Link href="/portal" className="underline hover:text-white">
                  /portal
                </Link>
                . If you have a full account covering multiple projects, log in at{" "}
                <Link href="/client-portal" className="underline hover:text-white">
                  /client-portal
                </Link>{" "}
                with your email address instead.
              </li>
              <li>
                <strong className="text-white">Budget.</strong> See the live cost breakdown per
                category. If your production team has requested it, you can approve or comment on the
                budget directly — no separate email needed.
              </li>
              <li>
                <strong className="text-white">Production plan.</strong> View equipment, catering,
                hotel &amp; flights, comms, power, artist riders and open questions for your event, all
                kept current by the production team.
              </li>
              <li>
                <strong className="text-white">Rider.</strong> Review the technical and hospitality
                rider for your event.
              </li>
              <li>
                <strong className="text-white">Rundown.</strong> Follow the show&apos;s running order in
                real time on the day of the event.
              </li>
              <li>
                <strong className="text-white">Requests.</strong> Use the request form to ask for
                changes or additions — these land directly on the production team&apos;s dashboard.
              </li>
              <li>
                <strong className="text-white">Documents.</strong> Some events include an intake
                checklist where you can upload photos or files the production team has asked for.
              </li>
            </ol>
          </section>

          {/* Supplier */}
          <section id="supplier" className="scroll-mt-8">
            <h2 className="mb-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
              Supplier Portal
            </h2>
            <p className="mb-5 text-white/60">
              For suppliers asked to quote on or deliver part of a production.
            </p>
            <ol className="list-decimal space-y-4 pl-5 text-white/80">
              <li>
                <strong className="text-white">Logging in.</strong> Log in at{" "}
                <Link href="/supplier-portal" className="underline hover:text-white">
                  /supplier-portal
                </Link>{" "}
                with the supplier code and password you received.
              </li>
              <li>
                <strong className="text-white">Quotes.</strong> Under &quot;Budget&quot; you&apos;ll see exactly which
                categories you&apos;ve been asked to quote on for each project — never more than what was
                requested from you.
              </li>
              <li>
                <strong className="text-white">Uploading a quote.</strong> Upload your quote as a PDF;
                it&apos;s automatically matched line by line against the categories you were asked to quote,
                so the production team doesn&apos;t have to re-type it.
              </li>
              <li>
                <strong className="text-white">Production requests.</strong> Under &quot;Requests&quot; you&apos;ll
                find anything specifically asked of you — equipment, catering, hotel, flights, comms or
                power — grouped per project.
              </li>
              <li>
                <strong className="text-white">Documents.</strong> Upload any other documents the
                production team needs from you (spec sheets, insurance, etc.) directly in the portal.
              </li>
            </ol>
          </section>

          {/* Crew */}
          <section id="crew" className="scroll-mt-8">
            <h2 className="mb-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
              Crew Portal
            </h2>
            <p className="mb-5 text-white/60">
              For crew working load-in, show or load-out.
            </p>
            <ol className="list-decimal space-y-4 pl-5 text-white/80">
              <li>
                <strong className="text-white">Logging in.</strong> Log in at{" "}
                <Link href="/crew-portal" className="underline hover:text-white">
                  /crew-portal
                </Link>{" "}
                with the crew code you received, and pick your department when asked.
              </li>
              <li>
                <strong className="text-white">Live rundown.</strong> You&apos;ll see the show&apos;s running
                order update in real time — the same cue everyone else on site is looking at.
              </li>
              <li>
                <strong className="text-white">Per-department instructions.</strong> Any cue with a note
                for your department shows it directly under that cue, so you only see what&apos;s relevant to
                you.
              </li>
              <li>
                <strong className="text-white">Countdown clock.</strong> Open the shared popup clock to
                keep an eye on the current cue&apos;s remaining time from any screen.
              </li>
              <li>
                <strong className="text-white">Chat.</strong> Use the built-in chat to coordinate with
                the showcaller and other departments during the show.
              </li>
            </ol>
          </section>

          {/* Showcaller */}
          <section id="showcaller" className="scroll-mt-8">
            <h2 className="mb-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
              Showcaller Portal
            </h2>
            <p className="mb-5 text-white/60">
              For whoever is calling the show and keeping every department in sync.
            </p>
            <ol className="list-decimal space-y-4 pl-5 text-white/80">
              <li>
                <strong className="text-white">Logging in.</strong> Log in at{" "}
                <Link href="/showcaller-portal" className="underline hover:text-white">
                  /showcaller-portal
                </Link>{" "}
                with the password for your stage — each stage has its own, so showcallers only ever
                control their own show.
              </li>
              <li>
                <strong className="text-white">Running the show.</strong> Start the rundown, advance to
                the next cue, or jump to a specific cue — every connected crew and client screen updates
                instantly.
              </li>
              <li>
                <strong className="text-white">Countdown clock.</strong> Open the shared popup clock so
                it can be displayed on a second screen backstage.
              </li>
              <li>
                <strong className="text-white">Chat.</strong> Message crew directly from the control bar
                if a cue needs to change on the fly.
              </li>
            </ol>
          </section>

          {/* Guest */}
          <section id="guest" className="scroll-mt-8">
            <h2 className="mb-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
              Guest Portal
            </h2>
            <p className="mb-5 text-white/60">
              For guests, VIPs or artists who need to submit documents ahead of the event.
            </p>
            <ol className="list-decimal space-y-4 pl-5 text-white/80">
              <li>
                <strong className="text-white">Logging in.</strong> Use the personal link you received
                by email — it opens{" "}
                <Link href="/guest-portal" className="underline hover:text-white">
                  /guest-portal
                </Link>{" "}
                with your invite already selected.
              </li>
              <li>
                <strong className="text-white">Uploading documents.</strong> Upload the documents
                requested for your accreditation — ID, insurance, or anything else the production team
                needs — directly from the portal.
              </li>
              <li>
                <strong className="text-white">On-site check-in.</strong> On the day, your badge is
                scanned at the entrance and you&apos;re checked in instantly — no paper lists.
              </li>
            </ol>
          </section>
        </div>

        <p className="mt-16 text-center text-sm text-white/40">
          Can&apos;t find what you&apos;re looking for? Contact the production team that invited you, or reach
          The Bridge Group B.V. via{" "}
          <a href="mailto:order@thebridgeavgroup.com" className="underline hover:text-white">
            order@thebridgeavgroup.com
          </a>
          .
        </p>
      </main>

      <Footer variant="dark" />
    </div>
  );
}
