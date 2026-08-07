"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/server/platform-admin";
import type { PlatformLeadStatus, SalesLeadActivityType } from "@/lib/types";

const STATUSES: PlatformLeadStatus[] = [
  "new",
  "contacted",
  "demo_given",
  "negotiating",
  "won",
  "lost",
  "churned",
];

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdmin(user.email)) redirect("/projects");
  return user;
}

function parseStatus(value: FormDataEntryValue | null): PlatformLeadStatus {
  const status = String(value ?? "new");
  return (STATUSES as string[]).includes(status) ? (status as PlatformLeadStatus) : "new";
}

export async function updatePlatformLead(leadId: string, formData: FormData) {
  await requirePlatformAdmin();

  const admin = createAdminClient();
  await admin
    .from("platform_leads")
    .update({
      status: parseStatus(formData.get("status")),
      next_follow_up_date: String(formData.get("next_follow_up_date") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  revalidatePath("/admin");
}

export async function addPlatformLeadActivity(leadId: string, formData: FormData) {
  await requirePlatformAdmin();

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const activityTypeRaw = String(formData.get("activity_type") ?? "note");
  const activityType: SalesLeadActivityType = (["call", "email", "meeting", "note"] as readonly string[]).includes(
    activityTypeRaw
  )
    ? (activityTypeRaw as SalesLeadActivityType)
    : "note";

  const admin = createAdminClient();
  await admin.from("platform_lead_activities").insert({
    platform_lead_id: leadId,
    activity_type: activityType,
    description,
  });

  // Elke gelogde interactie is meteen het nieuwe "laatste contact" — scheelt een los veld
  // handmatig bijwerken naast de interactie zelf.
  await admin
    .from("platform_leads")
    .update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", leadId);

  revalidatePath("/admin");
}

export async function deletePlatformLeadActivity(activityId: string) {
  await requirePlatformAdmin();

  const admin = createAdminClient();
  await admin.from("platform_lead_activities").delete().eq("id", activityId);

  revalidatePath("/admin");
}
