import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { AppLangToggle } from "@/components/app-lang-toggle";
import { MobileNavToggle, type MobileNavLink } from "@/components/mobile-nav-toggle";
import { createClient } from "@/lib/supabase/server";
import { computeCo2Total } from "@/lib/co2";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { getTeamOwnerId, getViewerNavSections } from "@/lib/server/team";
import { DEFAULT_BRANDING, getOrgBranding } from "@/lib/server/organization";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [flightResult, kmResult, quoteResult, lang, branding, navSections] = await Promise.all([
    supabase.from("crew_members").select("id", { count: "exact", head: true }).eq("needs_flight", true),
    supabase.from("categories").select("estimated_km"),
    supabase.from("quotes").select("co2_kg"),
    getAppLang(),
    user ? getTeamOwnerId(supabase, user.id).then(getOrgBranding) : Promise.resolve(DEFAULT_BRANDING),
    user ? getViewerNavSections(supabase, user.id) : Promise.resolve(null),
  ]);

  // null = alles zien (eigenaar, of teamlid zonder toegewezen rol) — bestaand gedrag.
  const hasSection = (key: string) => navSections === null || navSections.includes(key);

  const totalKm = (kmResult.data ?? []).reduce((sum, row) => sum + (row.estimated_km ?? 0), 0);
  const totalQuoteKg = (quoteResult.data ?? []).reduce((sum, row) => sum + (row.co2_kg ?? 0), 0);
  const co2 = computeCo2Total(flightResult.count ?? 0, totalKm, totalQuoteKg);

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
    "Uitloggen",
  ]);

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
          <nav className="hidden items-center gap-5 text-sm uppercase tracking-wide 2xl:flex">
            <Link href="/dashboard" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Dashboard")}
            </Link>
            {hasSection("projects") && (
              <Link href="/projects" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Projecten")}
              </Link>
            )}
            {hasSection("calendar") && (
              <Link href="/calendar" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Kalender")}
              </Link>
            )}
            {hasSection("analytics") && (
              <Link href="/analytics" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Analytics")}
              </Link>
            )}
            {hasSection("crm") && (
              <Link href="/crm" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Sales")}
              </Link>
            )}
            {hasSection("tenders") && (
              <Link href="/tenders" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Tenders")}
              </Link>
            )}
            {hasSection("suppliers") && (
              <Link href="/suppliers" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Leveranciers")}
              </Link>
            )}
            {hasSection("freelancers") && (
              <Link href="/freelancers" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Freelancers")}
              </Link>
            )}
            {hasSection("equipment") && (
              <Link href="/equipment" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Materiaal")}
              </Link>
            )}
            {hasSection("venues") && (
              <Link href="/venues" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Locaties")}
              </Link>
            )}
            {hasSection("clients") && (
              <Link href="/clients" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Klanten")}
              </Link>
            )}
            {hasSection("team") && (
              <Link href="/team" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                {t("Team")}
              </Link>
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/co2"
            className="flex shrink-0 items-center whitespace-nowrap text-white/70 transition-colors hover:text-white"
          >
            {co2Badge}
          </Link>
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
