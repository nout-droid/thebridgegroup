"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureRiderWithDefaults } from "@/lib/server/ensure-rider";

export async function addRiderSection(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const editableByClient = formData.get("editable_by_client") === "on";
  const includeInCallsheet = formData.get("include_in_callsheet") === "on";
  if (!title) return;

  const supabase = await createClient();
  const riderId = await ensureRiderWithDefaults(supabase, projectId);
  if (!riderId) return;

  const { count } = await supabase
    .from("rider_sections")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId);

  await supabase.from("rider_sections").insert({
    rider_id: riderId,
    title,
    editable_by_client: editableByClient,
    include_in_callsheet: includeInCallsheet,
    sort_order: count ?? 0,
  });

  revalidatePath(`/projects/${projectId}/rider`);
}

export async function updateRiderSection(projectId: string, sectionId: string, formData: FormData) {
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

  revalidatePath(`/projects/${projectId}/rider`);
}

export async function deleteRiderSection(projectId: string, sectionId: string) {
  const supabase = await createClient();
  await supabase.from("rider_sections").delete().eq("id", sectionId);
  revalidatePath(`/projects/${projectId}/rider`);
}

export async function moveRiderSection(
  projectId: string,
  riderId: string,
  sectionId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();

  const { data: sections } = await supabase
    .from("rider_sections")
    .select("id, sort_order")
    .eq("rider_id", riderId)
    .order("sort_order", { ascending: true });

  if (!sections) return;

  const index = sections.findIndex((s) => s.id === sectionId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= sections.length) return;

  const current = sections[index];
  const swap = sections[swapIndex];

  await supabase.from("rider_sections").update({ sort_order: swap.sort_order }).eq("id", current.id);
  await supabase.from("rider_sections").update({ sort_order: current.sort_order }).eq("id", swap.id);

  revalidatePath(`/projects/${projectId}/rider`);
}

export async function addRiderSectionItem(
  projectId: string,
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

  revalidatePath(`/projects/${projectId}/rider`);
}

export async function deleteRiderSectionItem(projectId: string, itemId: string) {
  const supabase = await createClient();
  await supabase.from("rider_section_items").delete().eq("id", itemId);
  revalidatePath(`/projects/${projectId}/rider`);
}
