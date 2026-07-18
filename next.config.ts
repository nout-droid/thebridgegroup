import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // De rider-PDF-route leest het logo en Poppins-lettertypen via fs op het
  // moment van het verzoek (src/lib/generate-rider-pdf.tsx), niet via een
  // statische import. Zonder deze hint kan Vercel's file-tracer die
  // bestanden missen in de serverless-bundle (werkt lokaal, ENOENT in
  // productie) — zelfde soort platform-verschil als de proxy/middleware-fix.
  outputFileTracingIncludes: {
    "/projects/\\[id\\]/rider/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
    "/share/\\[token\\]/rider/pdf": [
      "public/logo.png",
      "node_modules/@fontsource/poppins/files/*.woff",
    ],
  },
};

export default nextConfig;
