import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";
import { buildInvoiceGroups } from "@/lib/server/invoice-data";
import { getOrgBranding } from "@/lib/server/organization";
import { getAppLang, type AppLang } from "@/lib/server/lang";
import { getOrigin } from "@/lib/server/origin";

// Zelfde opzet als .../budget/invoice/route.ts, maar dan het document dat je vóór goedkeuring
// naar de klant stuurt: geen "Factuur" maar "Offerte", eigen nummering (quote_number/
// quote_date i.p.v. invoice_number/invoice_date — een project kan dus later nog een apart
// factuurnummer krijgen zonder het offertenummer te overschrijven).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name, event_date, user_id, quote_number, quote_date, quote_notes, client_reference, share_token")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const requestedLang = new URL(request.url).searchParams.get("lang");
  const lang: AppLang = requestedLang === "en" ? "en" : requestedLang === "nl" ? "nl" : await getAppLang();

  let quoteNumber = project.quote_number;
  let quoteDate = project.quote_date;
  if (!quoteNumber) {
    const year = new Date().getFullYear();
    quoteNumber = `OFF-${year}-${project.id.slice(0, 8).toUpperCase()}`;
    quoteDate = new Date().toISOString().slice(0, 10);
    await supabase
      .from("projects")
      .update({ quote_number: quoteNumber, quote_date: quoteDate })
      .eq("id", project.id);
  }

  const [{ groups, totalClientPrice }, branding, origin] = await Promise.all([
    buildInvoiceGroups(supabase, id),
    getOrgBranding(project.user_id),
    getOrigin(),
  ]);

  const pdfBuffer = await generateInvoicePdf(
    {
      documentType: "offerte",
      lang,
      projectName: project.name,
      clientName: project.client_name || null,
      eventDate: project.event_date,
      generatedAt: new Date(),
      groups,
      totalClientPrice,
      invoiceNumber: quoteNumber,
      invoiceDate: quoteDate!,
      notes: project.quote_notes || null,
      clientReference: project.client_reference || null,
      iban: branding.iban,
      portalUrl: `${origin}/share/${project.share_token}`,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quoteNumber}-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
