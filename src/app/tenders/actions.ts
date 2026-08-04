"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { createProjectForUser } from "@/lib/server/create-project-core";
import type { SalesLeadActivityType, TenderStage } from "@/lib/types";

const STAGES: TenderStage[] = ["geidentificeerd", "go_no_go", "ingediend", "gewonnen", "verloren"];

function parseStage(value: FormDataEntryValue | null): TenderStage {
  const stage = String(value ?? "geidentificeerd");
  return (STAGES as string[]).includes(stage) ? (stage as TenderStage) : "geidentificeerd";
}

export async function createTender(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  await supabase.from("tenders").insert({
    user_id: ownerId,
    title,
    client_name: String(formData.get("client_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
    stage: parseStage(formData.get("stage")),
    estimated_value: Math.max(0, Number(formData.get("estimated_value") ?? 0)),
    submission_deadline: String(formData.get("submission_deadline") ?? "") || null,
    decision_date: String(formData.get("decision_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim(),
  });

  revalidatePath("/tenders");
}

export async function updateTender(tenderId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();

  await supabase
    .from("tenders")
    .update({
      title,
      client_name: String(formData.get("client_name") ?? "").trim(),
      contact_name: String(formData.get("contact_name") ?? "").trim(),
      contact_email: String(formData.get("contact_email") ?? "").trim(),
      contact_phone: String(formData.get("contact_phone") ?? "").trim(),
      stage: parseStage(formData.get("stage")),
      estimated_value: Math.max(0, Number(formData.get("estimated_value") ?? 0)),
      submission_deadline: String(formData.get("submission_deadline") ?? "") || null,
      decision_date: String(formData.get("decision_date") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenderId);

  revalidatePath("/tenders");
}

export async function deleteTender(tenderId: string) {
  const supabase = await createClient();
  await supabase.from("tenders").delete().eq("id", tenderId);
  revalidatePath("/tenders");
}

export async function addTenderActivity(tenderId: string, formData: FormData) {
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

  await supabase.from("tender_activities").insert({
    tender_id: tenderId,
    activity_type: activityType,
    description,
    created_by: user?.id ?? null,
  });

  revalidatePath("/tenders");
}

export async function deleteTenderActivity(activityId: string) {
  const supabase = await createClient();
  await supabase.from("tender_activities").delete().eq("id", activityId);
  revalidatePath("/tenders");
}

// Zet een gewonnen tender om in een nieuw project — zelfde security-definer project-aanmaak-RPC
// als de normale "Nieuw project"-flow en de CRM-lead-conversie (incl. abonnement-check).
export async function convertTenderToProject(tenderId: string, formData: FormData) {
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
    redirect(`/tenders?error=${encodeURIComponent(error ?? "Project aanmaken mislukt.")}`);
  }

  await supabase
    .from("tenders")
    .update({ project_id: projectId, stage: "gewonnen", updated_at: new Date().toISOString() })
    .eq("id", tenderId);

  revalidatePath("/tenders");
  redirect(`/projects/${projectId}`);
}
