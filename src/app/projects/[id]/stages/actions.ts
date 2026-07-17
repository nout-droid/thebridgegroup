"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createStage(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("stages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("stages").insert({
    project_id: projectId,
    name,
    sort_order: count ?? 0,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateStage(projectId: string, stageId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("stages").update({ name }).eq("id", stageId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
}

export async function deleteStage(projectId: string, stageId: string) {
  const supabase = await createClient();
  await supabase.from("stages").delete().eq("id", stageId);

  revalidatePath(`/projects/${projectId}`);
}
