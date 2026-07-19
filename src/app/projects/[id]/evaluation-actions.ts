"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureEvaluation } from "@/lib/server/ensure-evaluation";

export async function saveEvaluation(projectId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "");

  const supabase = await createClient();
  const evaluationId = await ensureEvaluation(supabase, projectId);
  if (!evaluationId) return;

  await supabase
    .from("project_evaluations")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", evaluationId);

  revalidatePath(`/projects/${projectId}/evaluation`);
}
