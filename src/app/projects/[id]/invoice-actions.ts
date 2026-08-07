"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/server/audit";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/types";
import { isMoneybirdConfigured, pushInvoiceToMoneybird } from "@/lib/server/moneybird";

const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid"];

// Wijzigt alleen de status (verstuurd/betaald) van de bestaande lichte facturatie — het
// factuurnummer zelf wordt lazily aangemaakt bij de eerste PDF-download, zie
// src/app/projects/[id]/budget/invoice/route.ts. Gevoelige actie (betaalstatus) dus
// gelogd in het audit-logboek, zelfde patroon als "Categorie verwijderd" in ./actions.ts.
export async function setInvoiceStatus(projectId: string, formData: FormData) {
  const statusRaw = String(formData.get("invoice_status") ?? "");
  if (!INVOICE_STATUSES.includes(statusRaw as InvoiceStatus)) return;
  const status = statusRaw as InvoiceStatus;

  const supabase = await createClient();

  const [{ data: project }, { data: userData }] = await Promise.all([
    supabase.from("projects").select("user_id, name").eq("id", projectId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  await supabase.from("projects").update({ invoice_status: status }).eq("id", projectId);

  if (userData.user && project?.user_id) {
    const admin = createAdminClient();
    await logAudit(admin, {
      ownerId: project.user_id,
      actorLabel: userData.user.email ?? "Onbekend",
      action: "Factuurstatus gewijzigd",
      details: `${project.name}: ${INVOICE_STATUS_LABELS[status]}`,
    });
  }

  revalidatePath(`/projects/${projectId}/budget`);
}

// Zet de bestaande factuurberekening (dezelfde als de factuur-PDF) om naar een Moneybird
// sales_invoice — blijft inert (no-op met foutmelding) totdat de eigenaar bij Instellingen
// zijn administratie-ID + access token heeft ingevuld, zie src/lib/server/moneybird.ts.
export async function pushInvoiceToMoneybirdAction(projectId: string) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name, invoice_number, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const { data: organization } = await supabase
    .from("organizations")
    .select("moneybird_administration_id, moneybird_access_token")
    .eq("owner_user_id", project.user_id)
    .maybeSingle();

  if (!organization || !isMoneybirdConfigured(organization)) {
    redirect(
      `/projects/${projectId}/budget?error=${encodeURIComponent(
        "Moneybird is nog niet gekoppeld. Vul je administratie-ID en access token in bij Instellingen."
      )}`
    );
  }

  const result = await pushInvoiceToMoneybird(supabase, organization, project);

  if (!result.success) {
    redirect(
      `/projects/${projectId}/budget?error=${encodeURIComponent(
        "Versturen naar Moneybird is mislukt. Controleer de koppeling bij Instellingen."
      )}`
    );
  }

  await supabase
    .from("projects")
    .update({ moneybird_invoice_id: result.invoiceId, moneybird_synced_at: new Date().toISOString() })
    .eq("id", projectId);

  revalidatePath(`/projects/${projectId}/budget`);
}
