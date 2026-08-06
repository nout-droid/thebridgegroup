import "server-only";

// Backoffice (/admin) is uitsluitend voor de platform-eigenaar, niet voor klanten van het
// SaaS-product — vandaar een losse allowlist op e-mailadres i.p.v. een rol/vlag in de
// database die een klant ooit voor zichzelf zou kunnen instellen.
const PLATFORM_ADMIN_EMAILS = ["nout@thebridgeavgroup.com"];

export function isPlatformAdmin(email: string | null | undefined): boolean {
  return !!email && PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
}
