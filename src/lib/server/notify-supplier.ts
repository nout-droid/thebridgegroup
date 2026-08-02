import "server-only";
import { Resend } from "resend";
import type { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/server/origin";
import { renderSupplierRequestEmail } from "@/lib/server/supplier-request-email";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Best-effort: geen mailer geconfigureerd of geen contact_email bekend betekent gewoon geen
// mail, nooit een fout die de aanvraag zelf (die al is weggeschreven) laat mislukken.
export async function notifySupplierNewRequest(
  supabase: SupabaseServerClient,
  supplierId: string,
  projectName: string,
  categoryNames: string[]
) {
  if (!categoryNames.length) return;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("contact_email, portal_code")
    .eq("id", supplierId)
    .maybeSingle();
  if (!supplier?.contact_email) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const origin = await getOrigin();
    const { subject, html } = renderSupplierRequestEmail(
      origin,
      projectName,
      categoryNames,
      supplier.portal_code
    );
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: supplier.contact_email,
      subject,
      html,
    });
  } catch {
    // Best-effort; de aanvraag zelf staat al goed in de database.
  }
}
