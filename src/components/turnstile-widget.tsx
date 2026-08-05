"use client";

import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Render niets zolang NEXT_PUBLIC_TURNSTILE_SITE_KEY niet is ingesteld — zelfde inert-tot-keys
// patroon als de rest van de integraties (Stripe/Resend). De cf-turnstile div injecteert zelf
// een hidden input "cf-turnstile-response" in het omliggende <form>, dat serverkant met
// verifyTurnstileToken (src/lib/turnstile.ts) gecontroleerd wordt.
export function TurnstileWidget() {
  if (!SITE_KEY) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} data-theme="dark" />
    </>
  );
}
