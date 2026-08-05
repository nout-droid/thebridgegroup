import type { NextConfig } from "next";

// Standaard hardening-headers, van toepassing op elke response. Content-Security-Policy is
// hier bewust nog niet toegevoegd: deze app laadt org-geüploade logo's van onbekende domeinen,
// gaat naar Stripe Checkout, en praat met Supabase Storage/DeepL/Resend — een CSP moet eerst in
// report-only getest worden tegen die hele lijst voordat hij live mag, anders breekt hij ergens
// stilletjes iets. De headers hieronder hebben dat risico niet.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Vercel zet Strict-Transport-Security al automatisch op custom domains, maar zonder
  // includeSubDomains — expliciet overschrijven om ook subdomeinen te dwingen. Geen CSP-achtig
  // breekrisico: dit verandert alleen dat browsers HTTPS afdwingen, niet welk verkeer toegestaan is.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Elke PDF-genererende route leest het logo en Poppins-lettertypen via fs op het
  // moment van het verzoek (src/lib/generate-*-pdf.tsx), niet via een statische
  // import. Zonder deze hint kan Vercel's file-tracer die bestanden missen in de
  // serverless-bundle (werkt lokaal, ENOENT/503 in productie) — zelfde soort
  // platform-verschil als de proxy/middleware-fix. Dit moet dus voor ALLE routes
  // die een generate-*-pdf module importeren, niet alleen de rider-route waar
  // deze hint oorspronkelijk voor is toegevoegd.
  outputFileTracingIncludes: {
    "/projects/\\[id\\]/rider/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/rider/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/budget/invoice": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/budget/quote": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production-book": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/catering/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/comms/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/crew/\\[memberId\\]/badge": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/crew/badges": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/flight/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/hotel/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/materieel/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/production/power/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/rider/callsheet": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/projects/\\[id\\]/schedule/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/catering/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/comms/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/flight/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/hotel/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/materieel/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/power/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/production/schedule/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
  },
};

export default nextConfig;
