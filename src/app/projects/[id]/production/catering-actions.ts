"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/catering`);
}

function parseFormFields(formData: FormData) {
  return {
    order_date: String(formData.get("order_date") ?? ""),
    party: String(formData.get("party") ?? "").trim(),
    crew_lunch: Math.max(0, Number(formData.get("crew_lunch") ?? 0)),
    veggie_lunch: Math.max(0, Number(formData.get("veggie_lunch") ?? 0)),
    crew_dinner: Math.max(0, Number(formData.get("crew_dinner") ?? 0)),
    veggie_dinner: Math.max(0, Number(formData.get("veggie_dinner") ?? 0)),
    night_snacks: Math.max(0, Number(formData.get("night_snacks") ?? 0)),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function addCateringOrder(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.order_date || !fields.party) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("catering_orders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("catering_orders").insert({
    project_id: projectId,
    ...fields,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateCateringOrder(projectId: string, orderId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.order_date || !fields.party) return;

  const supabase = await createClient();
  await supabase.from("catering_orders").update(fields).eq("id", orderId);

  revalidate(projectId);
}

export async function deleteCateringOrder(projectId: string, orderId: string) {
  const supabase = await createClient();
  await supabase.from("catering_orders").delete().eq("id", orderId);
  revalidate(projectId);
}
