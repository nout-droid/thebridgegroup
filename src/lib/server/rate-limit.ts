import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

interface RateLimitOptions {
  maxAttempts: number;
  windowMinutes: number;
}

// Telt pogingen per (scope, identifier) binnen een tijdvenster — gebruikt voor elke
// login-/aanmeld-/wachtwoord-reset-actie in de app. Faalt open (nooit blokkeren) als de
// login_attempts-tabel nog niet bestaat, zodat dit nooit een login kan breken vóórdat de
// migratie is gedraaid — zelfde patroon als de organizations-tabel elders in de app.
export async function checkRateLimit(
  scope: string,
  identifier: string,
  { maxAttempts, windowMinutes }: RateLimitOptions
): Promise<{ blocked: boolean }> {
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await admin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("identifier", identifier)
    .gte("created_at", windowStart);

  if (error) return { blocked: false };
  if ((count ?? 0) >= maxAttempts) return { blocked: true };

  await admin.from("login_attempts").insert({ scope, identifier });
  return { blocked: false };
}

export const RATE_LIMIT_MESSAGE_NL = "Te veel pogingen. Probeer het over enkele minuten opnieuw.";
