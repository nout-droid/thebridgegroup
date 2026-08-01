import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
