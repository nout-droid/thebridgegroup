import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";
import { buildInvoiceGroups } from "@/lib/server/invoice-data";
import { getOrgBranding } from "@/lib/server/organization";
import type { AppLang } from "@/lib/server/lang";
import { getOrigin } from "@/lib/server/origin";

// Zelfde opzet als projects/[id]/budget/invoice/route.ts, maar token-scoped zodat de klant
// deze zelf kan downloaden vanuit het portaal — geen sessie nodig, alleen het share_token.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select(
      "id, name, client_name, event_date, user_id, invoice_number, invoice_date, client_reference, share_token, signature_url, signature_signed_by, signature_signed_at"
    )
    .eq("share_token", token)
    .maybeSingle();

  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const requestedLang = new URL(request.url).searchParams.get("lang");
  const lang: AppLang = requestedLang === "en" ? "en" : "nl";

  let invoiceNumber = project.invoice_number;
  let invoiceDate = project.invoice_date;
  if (!invoiceNumber) {
    const year = new Date().getFullYear();
    invoiceNumber = `INV-${year}-${project.id.slice(0, 8).toUpperCase()}`;
    invoiceDate = new Date().toISOString().slice(0, 10);
    await admin
      .from("projects")
      .update({ invoice_number: invoiceNumber, invoice_date: invoiceDate })
      .eq("id", project.id);
  }

  const [{ groups, totalClientPrice }, branding, origin] = await Promise.all([
    buildInvoiceGroups(admin, project.id),
    getOrgBranding(project.user_id),
    getOrigin(),
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
      portalUrl: `${origin}/share/${project.share_token}`,
      signature:
        project.signature_url && project.signature_signed_by && project.signature_signed_at
          ? {
              url: project.signature_url,
              signedBy: project.signature_signed_by,
              signedAt: project.signature_signed_at,
            }
          : null,
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
