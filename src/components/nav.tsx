import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { AppLangToggle } from "@/components/app-lang-toggle";
import { MobileNavToggle, type MobileNavLink } from "@/components/mobile-nav-toggle";
import { createClient } from "@/lib/supabase/server";
import { computeCo2Total } from "@/lib/co2";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { getTeamOwnerId } from "@/lib/server/team";
import { DEFAULT_BRANDING, getOrgBranding } from "@/lib/server/organization";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [flightResult, kmResult, quoteResult, lang, branding] = await Promise.all([
    supabase.from("crew_members").select("id", { count: "exact", head: true }).eq("needs_flight", true),
    supabase.from("categories").select("estimated_km"),
    supabase.from("quotes").select("co2_kg"),
    getAppLang(),
    user ? getTeamOwnerId(supabase, user.id).then(getOrgBranding) : Promise.resolve(DEFAULT_BRANDING),
  ]);

  const totalKm = (kmResult.data ?? []).reduce((sum, row) => sum + (row.estimated_km ?? 0), 0);
  const totalQuoteKg = (quoteResult.data ?? []).reduce((sum, row) => sum + (row.co2_kg ?? 0), 0);
  const co2 = computeCo2Total(flightResult.count ?? 0, totalKm, totalQuoteKg);

  const t = await createTranslator(lang, [
    "Dashboard",
    "Projecten",
    "Kalender",
    "Analytics",
    "Sales",
    "Leveranciers",
    "Freelancers",
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

  const mobileLinks: MobileNavLink[] = [
    { href: "/dashboard", label: t("Dashboard") },
    { href: "/projects", label: t("Projecten") },
    { href: "/calendar", label: t("Kalender") },
    { href: "/analytics", label: t("Analytics") },
    { href: "/crm", label: t("Sales") },
    { href: "/suppliers", label: t("Leveranciers") },
    { href: "/freelancers", label: t("Freelancers") },
    { href: "/venues", label: t("Locaties") },
    { href: "/clients", label: t("Klanten") },
    { href: "/team", label: t("Team") },
  ];

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
            <Link href="/projects" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Projecten")}
            </Link>
            <Link href="/calendar" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Kalender")}
            </Link>
            <Link href="/analytics" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Analytics")}
            </Link>
            <Link href="/crm" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Sales")}
            </Link>
            <Link href="/suppliers" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Leveranciers")}
            </Link>
            <Link href="/freelancers" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Freelancers")}
            </Link>
            <Link href="/venues" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Locaties")}
            </Link>
            <Link href="/clients" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Klanten")}
            </Link>
            <Link href="/team" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
              {t("Team")}
            </Link>
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
