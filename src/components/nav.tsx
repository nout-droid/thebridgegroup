import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { AppLangToggle } from "@/components/app-lang-toggle";
import { MobileNavToggle, type MobileNavLink } from "@/components/mobile-nav-toggle";
import { GlobalSearch, type GlobalSearchLabels } from "@/components/global-search";
import { NotificationBell, type NotificationBellLabels } from "@/components/notification-bell";
import { countUnreadNotifications } from "@/lib/server/notifications";
import { createClient } from "@/lib/supabase/server";
import { computeCo2Total } from "@/lib/co2";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { getViewerTeamInfo } from "@/lib/server/team";
import { DEFAULT_BRANDING, getOrgBranding } from "@/lib/server/organization";
import { isPlatformAdmin } from "@/lib/server/platform-admin";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // co2_totals() doet de som in Postgres i.p.v. alle crew/categorie/offerte-rijen van de hele
  // organisatie naar de client te sturen om ze hier in JS op te tellen — dit draait op vrijwel
  // elke ingelogde pagina, dus dat verschil telt op.
  const [co2Result, lang, teamInfo] = await Promise.all([
    supabase
      .rpc("co2_totals")
      .returns<{ flight_count: number; total_km: number; total_co2_kg: number }[]>()
      .maybeSingle(),
    getAppLang(),
    user ? getViewerTeamInfo(supabase, user.id) : Promise.resolve(null),
  ]);

  // Branding en het ongelezen-aantal hangen allebei alleen af van teamInfo.ownerId (niet van
  // elkaar) — parallel opvragen i.p.v. na elkaar, zelfde reden als de eerste Promise.all hierboven.
  const [branding, unreadCount] = await Promise.all([
    teamInfo ? getOrgBranding(teamInfo.ownerId) : Promise.resolve(DEFAULT_BRANDING),
    teamInfo ? countUnreadNotifications(supabase, teamInfo.ownerId) : Promise.resolve(0),
  ]);
  const navSections = teamInfo?.navSections ?? null;

  // null = alles zien (eigenaar, of teamlid zonder toegewezen rol) — bestaand gedrag.
  const hasSection = (key: string) => navSections === null || navSections.includes(key);

  const co2 = computeCo2Total(
    co2Result.data?.flight_count ?? 0,
    co2Result.data?.total_km ?? 0,
    co2Result.data?.total_co2_kg ?? 0
  );

  const t = await createTranslator(lang, [
    "Dashboard",
    "Projecten",
    "Kalender",
    "Analytics",
    "Sales",
    "Tenders",
    "Leveranciers",
    "Freelancers",
    "Materiaal",
    "Locaties",
    "Klanten",
    "Team",
    "Backoffice",
    "Uitloggen",
    "Zoeken",
    "Zoek in projecten, leveranciers, crew, locaties en sales...",
    "Zoek in projecten, leveranciers, crew, locaties en sales-leads.",
    "Typ minimaal 2 tekens om te zoeken.",
    "Geen resultaten gevonden.",
    "Projecten",
    "Locaties",
    "Meldingen",
    "Recente updates van klanten en leveranciers.",
    "Geen nieuwe meldingen.",
    "Alles gelezen",
    "geleden",
  ]);

  const searchLabels: GlobalSearchLabels = {
    title: t("Zoeken"),
    description: t("Zoek in projecten, leveranciers, crew, locaties en sales-leads."),
    placeholder: t("Zoek in projecten, leveranciers, crew, locaties en sales..."),
    noResults: t("Geen resultaten gevonden."),
    typeToSearch: t("Typ minimaal 2 tekens om te zoeken."),
    triggerLabel: t("Zoeken"),
    typeLabels: {
      project: t("Projecten"),
      supplier: t("Leveranciers"),
      freelancer: t("Freelancers"),
      venue: t("Locaties"),
      lead: t("Sales"),
    },
  };

  const notificationLabels: NotificationBellLabels = {
    title: t("Meldingen"),
    description: t("Recente updates van klanten en leveranciers."),
    empty: t("Geen nieuwe meldingen."),
    markAllRead: t("Alles gelezen"),
    ago: t("geleden"),
  };

  const co2Badge = (
    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] normal-case tracking-normal text-primary">
      🌱 {Math.round(co2.totalKg).toLocaleString("nl-NL")} kg
    </span>
  );

  const mobileLinks = (
    [
      { href: "/dashboard", label: t("Dashboard") },
      hasSection("projects") && { href: "/projects", label: t("Projecten") },
      hasSection("calendar") && { href: "/calendar", label: t("Kalender") },
      hasSection("analytics") && { href: "/analytics", label: t("Analytics") },
      hasSection("crm") && { href: "/crm", label: t("Sales") },
      hasSection("tenders") && { href: "/tenders", label: t("Tenders") },
      hasSection("suppliers") && { href: "/suppliers", label: t("Leveranciers") },
      hasSection("freelancers") && { href: "/freelancers", label: t("Freelancers") },
      hasSection("equipment") && { href: "/equipment", label: t("Materiaal") },
      hasSection("venues") && { href: "/venues", label: t("Locaties") },
      hasSection("clients") && { href: "/clients", label: t("Klanten") },
      hasSection("team") && { href: "/team", label: t("Team") },
      isPlatformAdmin(user?.email) && { href: "/admin", label: t("Backoffice") },
    ] as (MobileNavLink | false)[]
  ).filter((link): link is MobileNavLink => Boolean(link));

  return (
    <header className="relative border-b border-black bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 font-heading text-base font-extrabold tracking-tight normal-case"
            style={{ color: branding.brandColor }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- org-uploaded logo, unknown domain */}
            <img src={branding.logoUrl} alt={branding.name} width={28} height={21} className="shrink-0 object-contain" />
            <span className="truncate">{branding.name} &mdash; Productie</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/co2"
            className="flex shrink-0 items-center whitespace-nowrap text-white/70 transition-colors hover:text-white"
          >
            {co2Badge}
          </Link>
          <GlobalSearch labels={searchLabels} />
          {user && <NotificationBell initialCount={unreadCount} labels={notificationLabels} />}
          <AppLangToggle lang={lang} dark />
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="whitespace-nowrap px-2 text-white/70 hover:bg-white/10 hover:text-white sm:px-3"
            >
              {t("Uitloggen")}
            </Button>
          </form>
          <MobileNavToggle links={mobileLinks} />
        </div>
      </div>
    </header>
  );
}
