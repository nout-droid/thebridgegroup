import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";
import { buildInvoiceGroups } from "@/lib/server/invoice-data";
import { getOrgBranding } from "@/lib/server/organization";
import { getAppLang, type AppLang } from "@/lib/server/lang";

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
    .select("id, name, client_name, event_date, user_id, invoice_number, invoice_date, client_reference")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  // ?lang=en|nl overschrijft de huidige taaltoggle — zo kan een NL-browsende producer toch
  // een Engelse factuur naar een internationale klant sturen zonder de hele app om te zetten.
  const requestedLang = new URL(request.url).searchParams.get("lang");
  const lang: AppLang = requestedLang === "en" ? "en" : requestedLang === "nl" ? "nl" : await getAppLang();

  // Eerste keer dat de factuur voor dit project wordt gedownload: genereer een
  // factuurnummer + -datum en zet die vast, zodat elke volgende download (en de
  // status-badge op de begrotingspagina) hetzelfde nummer toont. Niet strikt
  // sequentieel/gapless — een korte projectcode volstaat voor een lichtgewicht
  // facturatiesysteem als dit.
  let invoiceNumber = project.invoice_number;
  let invoiceDate = project.invoice_date;
  if (!invoiceNumber) {
    const year = new Date().getFullYear();
    invoiceNumber = `INV-${year}-${project.id.slice(0, 8).toUpperCase()}`;
    invoiceDate = new Date().toISOString().slice(0, 10);
    await supabase
      .from("projects")
      .update({ invoice_number: invoiceNumber, invoice_date: invoiceDate })
      .eq("id", project.id);
  }

  const [{ groups, totalClientPrice }, branding] = await Promise.all([
    buildInvoiceGroups(supabase, id),
    getOrgBranding(project.user_id),
  ]);

  const pdfBuffer = await generateInvoicePdf(
    {
      documentType: "factuur",
      lang,
      projectName: project.name,
      clientName: project.client_name || null,
      eventDate: project.event_date,
      generatedAt: new Date(),
      groups,
      totalClientPrice,
      invoiceNumber,
      invoiceDate: invoiceDate!,
      notes: null,
      clientReference: project.client_reference || null,
      iban: branding.iban,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNumber}-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
