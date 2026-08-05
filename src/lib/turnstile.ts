import "server-only";

export const isTurnstileConfigured = Boolean(
  process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
);

// Zolang TURNSTILE_SECRET_KEY/NEXT_PUBLIC_TURNSTILE_SITE_KEY niet zijn ingesteld blijft dit
// een no-op (true) — zelfde inert-tot-keys patroon als Stripe/Resend, zodat signup niet
// crasht of blokkeert voordat de gebruiker zelf een Cloudflare Turnstile-site heeft
// aangemaakt en de keys heeft toegevoegd.
export async function verifyTurnstileToken(token: string, ip?: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (ip) body.set("remoteip", ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.success);
  } catch {
    // Cloudflare onbereikbaar — niet de gebruiker blokkeren voor een probleem aan onze kant.
    return true;
  }
}
