import type { NextConfig } from "next";

// org-geüploade logo's staan in Supabase Storage (bucket "org-logos", zie
// src/app/team/organization-actions.ts) — dus altijd hetzelfde project-domein, geen
// willekeurig extern domein. Stripe Checkout/Portal is een volledige redirect naar
// checkout.stripe.com, geen embed/iframe, dus die hoeft niet in de policy.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Report-Only: blokkeert niets, stuurt alleen violations naar /api/csp-report zodat we eerst
// tegen echt verkeer kunnen zien of deze lijst compleet is voordat een enforced CSP ooit
// overwogen wordt (die kan wél stilletjes iets breken als er een origin ontbreekt).
const cspReportOnly = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin} https://challenges.cloudflare.com`,
  `frame-src https://challenges.cloudflare.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `report-uri /api/csp-report`,
]
  .filter(Boolean)
  .join("; ");

// Standaard hardening-headers, van toepassing op elke response.
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
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
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
