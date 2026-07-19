"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateRundown } from "@/lib/server/ensure-rundown";
import { parseDuration } from "@/lib/rundown-time";

type AdminClient = ReturnType<typeof createAdminClient>;

// Elke actie hier gebruikt de service-role client (omzeilt RLS), dus elke
// mutatie moet zelf de eigenaarschap-keten terugverifiëren: cookie → geldig
// share_token met showcaller-toegang → rundown/item hoort echt bij dat project.
async function authorizedProjectId(token: string): Promise<string | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get(`showcaller_token_${token}`)) return null;

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .not("showcaller_password_hash", "is", null)
    .maybeSingle();

  return project?.id ?? null;
}

async function assertRundownOwnership(
  admin: AdminClient,
  projectId: string,
  rundownId: string
): Promise<boolean> {
  const { data } = await admin
    .from("rundowns")
    .select("project_id")
    .eq("id", rundownId)
    .maybeSingle();
  return data?.project_id === projectId;
}

async function assertItemOwnership(
  admin: AdminClient,
  projectId: string,
  itemId: string
): Promise<string | null> {
  const { data } = await admin
    .from("rundown_items")
    .select("rundown_id, rundowns!inner(project_id)")
    .eq("id", itemId)
    .maybeSingle<{ rundown_id: string; rundowns: { project_id: string } }>();

  if (!data || data.rundowns.project_id !== projectId) return null;
  return data.rundown_id;
}

function revalidate(token: string) {
  revalidatePath(`/showcaller/${token}`);
}

export async function showcallerEnsureRundown(
  token: string,
  stageId: string | null,
  showDate: string
): Promise<string | null> {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return null;

  const admin = createAdminClient();
  const rundownId = await getOrCreateRundown(admin, projectId, stageId, showDate);
  return rundownId ?? null;
}

export async function showcallerAddItem(token: string, rundownId: string, formData: FormData) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const cueNumber = String(formData.get("cue_number") ?? "").trim();
  const duration = parseDuration(String(formData.get("duration") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  const { count } = await admin
    .from("rundown_items")
    .select("id", { count: "exact", head: true })
    .eq("rundown_id", rundownId);

  await admin.from("rundown_items").insert({
    rundown_id: rundownId,
    cue_number: cueNumber,
    name,
    duration_seconds: duration || 60,
    notes,
    color,
    sort_order: count ?? 0,
  });

  revalidate(token);
}

export async function showcallerUpdateItem(token: string, itemId: string, formData: FormData) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertItemOwnership(admin, projectId, itemId))) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const cueNumber = String(formData.get("cue_number") ?? "").trim();
  const duration = parseDuration(String(formData.get("duration") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  await admin
    .from("rundown_items")
    .update({
      cue_number: cueNumber,
      name,
      duration_seconds: duration || 60,
      notes,
      color,
    })
    .eq("id", itemId);

  revalidate(token);
}

export async function showcallerAddInstruction(token: string, itemId: string, formData: FormData) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertItemOwnership(admin, projectId, itemId))) return;

  const instruction = String(formData.get("instruction") ?? "").trim();
  if (!instruction) return;

  const division = String(formData.get("division") ?? "").trim();

  const { count } = await admin
    .from("rundown_item_instructions")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);

  await admin.from("rundown_item_instructions").insert({
    item_id: itemId,
    division,
    instruction,
    sort_order: count ?? 0,
  });

  revalidate(token);
}

export async function showcallerDeleteInstruction(token: string, instructionId: string) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("rundown_item_instructions")
    .select("item_id")
    .eq("id", instructionId)
    .maybeSingle();
  if (!data) return;

  if (!(await assertItemOwnership(admin, projectId, data.item_id))) return;

  await admin.from("rundown_item_instructions").delete().eq("id", instructionId);

  revalidate(token);
}

export async function showcallerDeleteItem(token: string, rundownId: string, itemId: string) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertItemOwnership(admin, projectId, itemId))) return;

  await admin
    .from("rundowns")
    .update({ current_item_id: null, current_item_started_at: null })
    .eq("id", rundownId)
    .eq("current_item_id", itemId);

  await admin.from("rundown_items").delete().eq("id", itemId);

  revalidate(token);
}

export async function showcallerMoveItem(
  token: string,
  rundownId: string,
  itemId: string,
  direction: "up" | "down"
) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  const { data: items } = await admin
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

  await admin.from("rundown_items").update({ sort_order: swap.sort_order }).eq("id", current.id);
  await admin.from("rundown_items").update({ sort_order: current.sort_order }).eq("id", swap.id);

  revalidate(token);
}

export async function showcallerSetStartTime(token: string, rundownId: string, formData: FormData) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  const startTime = String(formData.get("start_time") ?? "").trim();
  if (!startTime) return;

  await admin.from("rundowns").update({ start_time: startTime }).eq("id", rundownId);

  revalidate(token);
}

export async function showcallerStartShow(token: string, rundownId: string) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  const { data: firstItem } = await admin
    .from("rundown_items")
    .select("id")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!firstItem) return;

  const startedAt = new Date().toISOString();
  await admin
    .from("rundowns")
    .update({
      is_live: true,
      current_item_id: firstItem.id,
      current_item_started_at: startedAt,
      actual_start_at: startedAt,
    })
    .eq("id", rundownId);

  revalidate(token);
}

export async function showcallerStopShow(token: string, rundownId: string) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  await admin
    .from("rundowns")
    .update({
      is_live: false,
      current_item_id: null,
      current_item_started_at: null,
      actual_start_at: null,
    })
    .eq("id", rundownId);

  revalidate(token);
}

export async function showcallerNextCue(token: string, rundownId: string) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  const { data: rundown } = await admin
    .from("rundowns")
    .select("current_item_id")
    .eq("id", rundownId)
    .maybeSingle();

  const { data: items } = await admin
    .from("rundown_items")
    .select("id")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true });
  if (!items?.length) return;

  const currentIndex = items.findIndex((i) => i.id === rundown?.current_item_id);
  const nextItem = items[currentIndex + 1];

  if (!nextItem) {
    await admin
      .from("rundowns")
      .update({
        is_live: false,
        current_item_id: null,
        current_item_started_at: null,
        actual_start_at: null,
      })
      .eq("id", rundownId);
  } else {
    await admin
      .from("rundowns")
      .update({ current_item_id: nextItem.id, current_item_started_at: new Date().toISOString() })
      .eq("id", rundownId);
  }

  revalidate(token);
}

export async function showcallerPreviousCue(token: string, rundownId: string) {
  const projectId = await authorizedProjectId(token);
  if (!projectId) return;

  const admin = createAdminClient();
  if (!(await assertRundownOwnership(admin, projectId, rundownId))) return;

  const { data: rundown } = await admin
    .from("rundowns")
    .select("current_item_id")
    .eq("id", rundownId)
    .maybeSingle();

  const { data: items } = await admin
    .from("rundown_items")
    .select("id")
    .eq("rundown_id", rundownId)
    .order("sort_order", { ascending: true });
  if (!items?.length) return;

  const currentIndex = items.findIndex((i) => i.id === rundown?.current_item_id);
  const prevItem = items[Math.max(0, currentIndex - 1)];
  if (!prevItem) return;

  await admin
    .from("rundowns")
    .update({ current_item_id: prevItem.id, current_item_started_at: new Date().toISOString() })
    .eq("id", rundownId);

  revalidate(token);
}
