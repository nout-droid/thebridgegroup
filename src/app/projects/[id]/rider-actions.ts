"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureRiderWithDefaults } from "@/lib/server/ensure-rider";

function revalidateRider(projectId: string, stageId: string | null) {
  revalidatePath(`/projects/${projectId}/rider`);
  if (stageId) revalidatePath(`/projects/${projectId}/stages/${stageId}/rider`);
}

export async function addRiderSection(
  projectId: string,
  stageId: string | null,
  formData: FormData
) {
  const title = String(formData.get("title") ?? "").trim();
  const editableByClient = formData.get("editable_by_client") === "on";
  const includeInCallsheet = formData.get("include_in_callsheet") === "on";
  if (!title) return;

  const supabase = await createClient();
  const riderId = await ensureRiderWithDefaults(supabase, projectId);
  if (!riderId) return;

  let countQuery = supabase
    .from("rider_sections")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId);
  countQuery = stageId ? countQuery.eq("stage_id", stageId) : countQuery.is("stage_id", null);
  const { count } = await countQuery;

  await supabase.from("rider_sections").insert({
    rider_id: riderId,
    stage_id: stageId,
    title,
    editable_by_client: editableByClient,
    include_in_callsheet: includeInCallsheet,
    sort_order: count ?? 0,
  });

  revalidateRider(projectId, stageId);
}

export async function updateRiderSection(
  projectId: string,
  stageId: string | null,
  sectionId: string,
  formData: FormData
) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const editableByClient = formData.get("editable_by_client") === "on";
  const includeInCallsheet = formData.get("include_in_callsheet") === "on";
  if (!title) return;

  const supabase = await createClient();
  await supabase
    .from("rider_sections")
    .update({
      title,
      content,
      editable_by_client: editableByClient,
      include_in_callsheet: includeInCallsheet,
      updated_by: "owner",
    })
    .eq("id", sectionId);

  revalidateRider(projectId, stageId);
}

export async function deleteRiderSection(projectId: string, stageId: string | null, sectionId: string) {
  const supabase = await createClient();
  await supabase.from("rider_sections").delete().eq("id", sectionId);
  revalidateRider(projectId, stageId);
}

export async function moveRiderSection(
  projectId: string,
  stageId: string | null,
  riderId: string,
  sectionId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();

  let query = supabase
    .from("rider_sections")
    .select("id, sort_order")
    .eq("rider_id", riderId);
  query = stageId ? query.eq("stage_id", stageId) : query.is("stage_id", null);
  const { data: sections } = await query.order("sort_order", { ascending: true });

  if (!sections) return;

  const index = sections.findIndex((s) => s.id === sectionId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= sections.length) return;

  const current = sections[index];
  const swap = sections[swapIndex];

  await supabase.from("rider_sections").update({ sort_order: swap.sort_order }).eq("id", current.id);
  await supabase.from("rider_sections").update({ sort_order: current.sort_order }).eq("id", swap.id);

  revalidateRider(projectId, stageId);
}

export async function addRiderSectionItem(
  projectId: string,
  stageId: string | null,
  sectionId: string,
  formData: FormData
) {
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const supabase = await createClient();

  const { count } = await supabase
    .from("rider_section_items")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  await supabase.from("rider_section_items").insert({
    section_id: sectionId,
    description,
    sort_order: count ?? 0,
  });

  revalidateRider(projectId, stageId);
}

export async function deleteRiderSectionItem(projectId: string, stageId: string | null, itemId: string) {
  const supabase = await createClient();
  await supabase.from("rider_section_items").delete().eq("id", itemId);
  revalidateRider(projectId, stageId);
}
