"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDuration } from "@/lib/rundown-time";

function revalidate(projectId: string, stageId: string | null) {
  revalidatePath(
    stageId ? `/projects/${projectId}/stages/${stageId}/rundown` : `/projects/${projectId}/rundown`
  );
}

export async function addRundownItem(
  projectId: string,
  stageId: string | null,
  rundownId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const cueNumber = String(formData.get("cue_number") ?? "").trim();
  const duration = parseDuration(String(formData.get("duration") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  const supabase = await createClient();
  const { count } = await supabase
    .from("rundown_items")
    .select("id", { count: "exact", head: true })
    .eq("rundown_id", rundownId);

  await supabase.from("rundown_items").insert({
    rundown_id: rundownId,
    cue_number: cueNumber,
    name,
    duration_seconds: duration || 60,
    notes,
    color,
    sort_order: count ?? 0,
  });

  revalidate(projectId, stageId);
}

export async function updateRundownItem(
  projectId: string,
  stageId: string | null,
  itemId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const cueNumber = String(formData.get("cue_number") ?? "").trim();
  const duration = parseDuration(String(formData.get("duration") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("rundown_items")
    .update({
      cue_number: cueNumber,
      name,
      duration_seconds: duration || 60,
      notes,
      color,
    })
    .eq("id", itemId);

  revalidate(projectId, stageId);
}

export async function addRundownInstruction(
  projectId: string,
  stageId: string | null,
  itemId: string,
  formData: FormData
) {
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (!instruction) return;

  const division = String(formData.get("division") ?? "").trim();

  const supabase = await createClient();
  const { count } = await supabase
    .from("rundown_item_instructions")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);

  await supabase.from("rundown_item_instructions").insert({
    item_id: itemId,
    division,
    instruction,
    sort_order: count ?? 0,
  });

  revalidate(projectId, stageId);
}

export async function deleteRundownInstruction(
  projectId: string,
  stageId: string | null,
  instructionId: string
) {
  const supabase = await createClient();
  await supabase.from("rundown_item_instructions").delete().eq("id", instructionId);

  revalidate(projectId, stageId);
}

export async function deleteRundownItem(
  projectId: string,
  stageId: string | null,
  rundownId: string,
  itemId: string
) {
  const supabase = await createClient();

  await supabase
    .from("rundowns")
    .update({ current_item_id: null, current_item_started_at: null })
    .eq("id", rundownId)
    .eq("current_item_id", itemId);

  await supabase.from("rundown_items").delete().eq("id", itemId);

  revalidate(projectId, stageId);
}

export async function moveRundownItem(
  projectId: string,
  stageId: string | null,
  rundownId: string,
  itemId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("rundown_items")
    .select("id, sort_order")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true });

  if (!items) return;

  const index = items.findIndex((i) => i.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swap = items[swapIndex];

  await supabase.from("rundown_items").update({ sort_order: swap.sort_order }).eq("id", current.id);
  await supabase.from("rundown_items").update({ sort_order: current.sort_order }).eq("id", swap.id);

  revalidate(projectId, stageId);
}

export async function setRundownStartTime(
  projectId: string,
  stageId: string | null,
  rundownId: string,
  formData: FormData
) {
  const startTime = String(formData.get("start_time") ?? "").trim();
  if (!startTime) return;

  const supabase = await createClient();
  await supabase.from("rundowns").update({ start_time: startTime }).eq("id", rundownId);

  revalidate(projectId, stageId);
}

export async function startShow(projectId: string, stageId: string | null, rundownId: string) {
  const supabase = await createClient();

  const { data: firstItem } = await supabase
    .from("rundown_items")
    .select("id")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstItem) return;

  const startedAt = new Date().toISOString();
  await supabase
    .from("rundowns")
    .update({
      is_live: true,
      current_item_id: firstItem.id,
      current_item_started_at: startedAt,
      actual_start_at: startedAt,
    })
    .eq("id", rundownId);

  revalidate(projectId, stageId);
}

export async function stopShow(projectId: string, stageId: string | null, rundownId: string) {
  const supabase = await createClient();
  await supabase
    .from("rundowns")
    .update({
      is_live: false,
      current_item_id: null,
      current_item_started_at: null,
      actual_start_at: null,
    })
    .eq("id", rundownId);

  revalidate(projectId, stageId);
}

export async function jumpToCue(
  projectId: string,
  stageId: string | null,
  rundownId: string,
  itemId: string
) {
  const supabase = await createClient();
  await supabase
    .from("rundowns")
    .update({ current_item_id: itemId, current_item_started_at: new Date().toISOString() })
    .eq("id", rundownId);

  revalidate(projectId, stageId);
}

export async function nextCue(projectId: string, stageId: string | null, rundownId: string) {
  const supabase = await createClient();

  const { data: rundown } = await supabase
    .from("rundowns")
    .select("current_item_id")
    .eq("id", rundownId)
    .maybeSingle();

  const { data: items } = await supabase
    .from("rundown_items")
    .select("id")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true });

  if (!items?.length) return;

  const currentIndex = items.findIndex((i) => i.id === rundown?.current_item_id);
  const nextItem = items[currentIndex + 1];

  if (!nextItem) {
    await stopShow(projectId, stageId, rundownId);
    return;
  }

  await supabase
    .from("rundowns")
    .update({ current_item_id: nextItem.id, current_item_started_at: new Date().toISOString() })
    .eq("id", rundownId);

  revalidate(projectId, stageId);
}

export async function previousCue(projectId: string, stageId: string | null, rundownId: string) {
  const supabase = await createClient();

  const { data: rundown } = await supabase
    .from("rundowns")
    .select("current_item_id")
    .eq("id", rundownId)
    .maybeSingle();

  const { data: items } = await supabase
    .from("rundown_items")
    .select("id")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true });

  if (!items?.length) return;

  const currentIndex = items.findIndex((i) => i.id === rundown?.current_item_id);
  const prevItem = items[Math.max(0, currentIndex - 1)];
  if (!prevItem) return;

  await supabase
    .from("rundowns")
    .update({ current_item_id: prevItem.id, current_item_started_at: new Date().toISOString() })
    .eq("id", rundownId);

  revalidate(projectId, stageId);
}
