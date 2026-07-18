"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureIntakeChecklist } from "@/lib/server/ensure-intake-checklist";

export async function saveIntakeChecklistAnswer(
  projectId: string,
  sectionKey: string,
  formData: FormData
) {
  const content = String(formData.get("content") ?? "");

  const supabase = await createClient();
  const checklistId = await ensureIntakeChecklist(supabase, projectId);
  if (!checklistId) return;

  await supabase.from("intake_checklist_answers").upsert(
    {
      checklist_id: checklistId,
      section_key: sectionKey,
      content,
      updated_by: "owner",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "checklist_id,section_key" }
  );

  revalidatePath(`/projects/${projectId}/intake`);
}
