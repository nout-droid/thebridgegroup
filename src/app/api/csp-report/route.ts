import { NextRequest, NextResponse } from "next/server";

// Ontvangt Content-Security-Policy-Report-Only violations vanuit de browser (report-uri
// directive in next.config.ts). Logt naar Vercel's function logs zodat we een periode kunnen
// verzamelen welke directives in de praktijk worden geraakt, voordat de policy ooit
// enforced (niet report-only) mag gaan — zie de toelichting bij securityHeaders in next.config.ts.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report = body["csp-report"] ?? body;
    console.warn("[csp-report]", JSON.stringify(report));
  } catch {
    // Sommige browsers sturen een leeg of niet-JSON body — niets om te loggen, geen probleem.
  }
  return new NextResponse(null, { status: 204 });
}
