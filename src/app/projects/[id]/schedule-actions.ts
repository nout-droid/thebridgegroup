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

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
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
    supplier_id: supplierId,
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

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const priority = String(formData.get("priority") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("schedule_items")
    .update({
      activity_date: activityDate,
      activity_time: activityTime,
      activity,
      supplier_id: supplierId,
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
