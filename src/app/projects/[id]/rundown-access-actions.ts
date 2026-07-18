"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setCrewPassword(projectId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_crew_password", { p_project_id: projectId, p_password: password });

  revalidatePath(`/projects/${projectId}/rundown`);
}

export async function setShowcallerPassword(projectId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_showcaller_password", { p_project_id: projectId, p_password: password });

  revalidatePath(`/projects/${projectId}/rundown`);
}

export async function setStageShowcallerPassword(
  projectId: string,
  stageId: string,
  formData: FormData
) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_stage_showcaller_password", { p_stage_id: stageId, p_password: password });

  revalidatePath(`/projects/${projectId}/rundown`);
}
