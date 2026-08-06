"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { createProjectForUser } from "@/lib/server/create-project-core";
import type { SalesLeadActivityType, SalesLeadStage } from "@/lib/types";

const STAGES: SalesLeadStage[] = ["lead", "contacted", "proposal", "quote_sent", "won", "lost"];

// Standaard win-kans per stadium — alleen een startwaarde bij het aanmaken/verplaatsen
// van een lead, de gebruiker kan 'm per lead altijd handmatig overschrijven.
const DEFAULT_PROBABILITY: Record<SalesLeadStage, number> = {
  lead: 10,
  contacted: 25,
  proposal: 50,
  quote_sent: 75,
  won: 100,
  lost: 0,
};

function parseStage(value: FormDataEntryValue | null): SalesLeadStage {
  const stage = String(value ?? "lead");
  return (STAGES as string[]).includes(stage) ? (stage as SalesLeadStage) : "lead";
}

export async function createLead(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) return;

  const stage = parseStage(formData.get("stage"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  await supabase.from("sales_leads").insert({
    user_id: ownerId,
    company_name: companyName,
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    stage,
    estimated_value: Math.max(0, Number(formData.get("estimated_value") ?? 0)),
    probability_percentage: Number(formData.get("probability_percentage") ?? DEFAULT_PROBABILITY[stage]),
    expected_close_date: String(formData.get("expected_close_date") ?? "") || null,
    next_follow_up_date: String(formData.get("next_follow_up_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim(),
  });

  revalidatePath("/crm");
}

export async function updateLead(leadId: string, formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) return;

  const stage = parseStage(formData.get("stage"));
  const supabase = await createClient();

  await supabase
    .from("sales_leads")
    .update({
      company_name: companyName,
      contact_name: String(formData.get("contact_name") ?? "").trim(),
      contact_email: String(formData.get("contact_email") ?? "").trim(),
      contact_phone: String(formData.get("contact_phone") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
      source: String(formData.get("source") ?? "").trim(),
      stage,
      estimated_value: Math.max(0, Number(formData.get("estimated_value") ?? 0)),
      probability_percentage: Number(formData.get("probability_percentage") ?? DEFAULT_PROBABILITY[stage]),
      expected_close_date: String(formData.get("expected_close_date") ?? "") || null,
      next_follow_up_date: String(formData.get("next_follow_up_date") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  revalidatePath("/crm");
}

export async function deleteLead(leadId: string) {
  const supabase = await createClient();
  await supabase.from("sales_leads").delete().eq("id", leadId);
  revalidatePath("/crm");
}

export async function addLeadActivity(leadId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const activityTypeRaw = String(formData.get("activity_type") ?? "note");
  const activityType: SalesLeadActivityType = (["call", "email", "meeting", "note"] as const).includes(
    activityTypeRaw as SalesLeadActivityType
  )
    ? (activityTypeRaw as SalesLeadActivityType)
    : "note";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("sales_lead_activities").insert({
    lead_id: leadId,
    activity_type: activityType,
    description,
    created_by: user?.id ?? null,
  });

  revalidatePath("/crm");
}

export async function deleteLeadActivity(activityId: string) {
  const supabase = await createClient();
  await supabase.from("sales_lead_activities").delete().eq("id", activityId);
  revalidatePath("/crm");
}

// Zet een gewonnen lead om in een nieuw project: hergebruikt dezelfde security-definer
// project-aanmaak-RPC als de normale "Nieuw project"-flow (incl. abonnement-check), en
// koppelt de lead er daarna aan zodat de pipeline 'm als gewonnen + gekoppeld toont.
export async function convertLeadToProject(leadId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "") || null;
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { projectId, error } = await createProjectForUser(supabase, user.id, {
    name,
    clientName,
    eventDate,
  });

  if (error || !projectId) {
    redirect(`/crm?error=${encodeURIComponent(error ?? "Project aanmaken mislukt.")}`);
  }

  await supabase
    .from("sales_leads")
    .update({ project_id: projectId, stage: "won", updated_at: new Date().toISOString() })
    .eq("id", leadId);

  revalidatePath("/crm");
  redirect(`/projects/${projectId}`);
}
