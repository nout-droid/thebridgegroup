import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { OrgBranding } from "./server/organization";

const DEFAULT_LOGO_PATH = path.join(process.cwd(), "public/logo.png");

// Het eigen logo (public/logo.png) staat lokaal en wordt via fs gelezen (zelfde patroon als
// voorheen). Een aangepast org-logo is een publieke Supabase Storage-URL — die halen we op
// via fetch. Bij een falende fetch (netwerk, verwijderd bestand) valt dit terug op het eigen
// logo i.p.v. de hele PDF te laten breken.
export async function resolveLogoBuffer(branding: OrgBranding): Promise<Buffer> {
  if (!branding.logoUrl || branding.logoUrl === "/logo.png") {
    return fs.readFileSync(DEFAULT_LOGO_PATH);
  }
  try {
    const res = await fetch(branding.logoUrl);
    if (!res.ok) throw new Error("logo fetch mislukt");
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return fs.readFileSync(DEFAULT_LOGO_PATH);
  }
}
