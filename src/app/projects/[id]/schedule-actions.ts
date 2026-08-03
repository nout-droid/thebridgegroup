"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string, stageId: string | null) {
  revalidatePath(
    stageId
      ? `/projects/${projectId}/stages/${stageId}/schedule`
      : `/projects/${projectId}/schedule`
  );
}

export async function addScheduleItem(
  projectId: string,
  stageId: string | null,
  formData: FormData
) {
  const activityDate = String(formData.get("activity_date") ?? "");
  const activityTime = String(formData.get("activity_time") ?? "");
  const activity = String(formData.get("activity") ?? "").trim();
  if (!activityDate || !activityTime || !activity) return;

  const priority = String(formData.get("priority") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();
  let countQuery = supabase
    .from("schedule_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  countQuery = stageId ? countQuery.eq("stage_id", stageId) : countQuery.is("stage_id", null);
  const { count } = await countQuery;

  await supabase.from("schedule_items").insert({
    project_id: projectId,
    stage_id: stageId,
    activity_date: activityDate,
    activity_time: activityTime,
    activity,
    priority,
    notes,
    sort_order: count ?? 0,
  });

  revalidate(projectId, stageId);
}

export async function updateScheduleItem(
  projectId: string,
  stageId: string | null,
  itemId: string,
  formData: FormData
) {
  const activityDate = String(formData.get("activity_date") ?? "");
  const activityTime = String(formData.get("activity_time") ?? "");
  const activity = String(formData.get("activity") ?? "").trim();
  if (!activityDate || !activityTime || !activity) return;

  const priority = String(formData.get("priority") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("schedule_items")
    .update({
      activity_date: activityDate,
      activity_time: activityTime,
      activity,
      priority,
      notes,
    })
    .eq("id", itemId);

  revalidate(projectId, stageId);
}

export async function deleteScheduleItem(
  projectId: string,
  stageId: string | null,
  itemId: string
) {
  const supabase = await createClient();
  await supabase.from("schedule_items").delete().eq("id", itemId);

  revalidate(projectId, stageId);
}

// De volgorde binnen een dag is de bron van waarheid voor het draaiboek (net als bij de
// live rundown_items) — tijd is alleen informatief. Zo kan een producer een activiteit
// altijd handmatig eerder zetten, ook als er nog geen tijd voor bekend is.
export async function moveScheduleItem(
  projectId: string,
  stageId: string | null,
  itemId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("schedule_items")
    .select("id, activity_date")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return;

  let query = supabase
    .from("schedule_items")
    .select("id, sort_order")
    .eq("project_id", projectId)
    .eq("activity_date", item.activity_date)
    .order("sort_order", { ascending: true });
  query = stageId ? query.eq("stage_id", stageId) : query.is("stage_id", null);
  const { data: items } = await query;
  if (!items) return;

  const index = items.findIndex((i) => i.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swap = items[swapIndex];

  await supabase.from("schedule_items").update({ sort_order: swap.sort_order }).eq("id", current.id);
  await supabase.from("schedule_items").update({ sort_order: current.sort_order }).eq("id", swap.id);

  revalidate(projectId, stageId);
}

export async function addScheduleItemSupplier(
  projectId: string,
  stageId: string | null,
  itemId: string,
  formData: FormData
) {
  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  if (!supplierId) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("schedule_item_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("schedule_item_id", itemId);

  await supabase.from("schedule_item_suppliers").insert({
    schedule_item_id: itemId,
    supplier_id: supplierId,
    sort_order: count ?? 0,
  });

  revalidate(projectId, stageId);
}

export async function deleteScheduleItemSupplier(
  projectId: string,
  stageId: string | null,
  linkId: string
) {
  const supabase = await createClient();
  await supabase.from("schedule_item_suppliers").delete().eq("id", linkId);

  revalidate(projectId, stageId);
}
