"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/power`);
}

function parseFormFields(formData: FormData) {
  return {
    stage_id: String(formData.get("stage_id") ?? "") || null,
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    description: String(formData.get("description") ?? "").trim(),
    quantity: Math.max(1, Number(formData.get("quantity") ?? 1)),
    position: String(formData.get("position") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function addPowerRequest(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.description) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("power_requests")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("power_requests").insert({
    project_id: projectId,
    ...fields,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updatePowerRequest(projectId: string, requestId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.description) return;

  const supabase = await createClient();
  await supabase.from("power_requests").update(fields).eq("id", requestId);

  revalidate(projectId);
}

export async function deletePowerRequest(projectId: string, requestId: string) {
  const supabase = await createClient();
  await supabase.from("power_requests").delete().eq("id", requestId);
  revalidate(projectId);
}
