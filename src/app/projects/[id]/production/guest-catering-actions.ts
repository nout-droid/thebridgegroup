"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/guest-catering`);
}

function parseFormFields(formData: FormData) {
  return {
    order_date: String(formData.get("order_date") ?? ""),
    moment: String(formData.get("moment") ?? "diner"),
    style: String(formData.get("style") ?? "buffet"),
    guest_count: Math.max(0, Number(formData.get("guest_count") ?? 0)),
    veggie_count: Math.max(0, Number(formData.get("veggie_count") ?? 0)),
    vegan_count: Math.max(0, Number(formData.get("vegan_count") ?? 0)),
    kids_count: Math.max(0, Number(formData.get("kids_count") ?? 0)),
    special_diet_count: Math.max(0, Number(formData.get("special_diet_count") ?? 0)),
    notes: String(formData.get("notes") ?? "").trim(),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    stage_id: String(formData.get("stage_id") ?? "") || null,
  };
}

export async function addGuestCateringOrder(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.order_date) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("guest_catering_orders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("guest_catering_orders").insert({
    project_id: projectId,
    ...fields,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateGuestCateringOrder(projectId: string, orderId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.order_date) return;

  const supabase = await createClient();
  await supabase.from("guest_catering_orders").update(fields).eq("id", orderId);

  revalidate(projectId);
}

export async function deleteGuestCateringOrder(projectId: string, orderId: string) {
  const supabase = await createClient();
  await supabase.from("guest_catering_orders").delete().eq("id", orderId);
  revalidate(projectId);
}
