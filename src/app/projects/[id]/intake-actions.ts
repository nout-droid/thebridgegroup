"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureIntakeChecklist } from "@/lib/server/ensure-intake-checklist";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";

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

export async function uploadIntakeChecklistPhoto(
  projectId: string,
  sectionKey: string,
  formData: FormData
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const checklistId = await ensureIntakeChecklist(supabase, projectId);
  if (!checklistId) return;

  const path = `intake/${projectId}/${sectionKey}/${Date.now()}-${file.name}`;
  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await supabase.from("intake_checklist_photos").insert({
    checklist_id: checklistId,
    section_key: sectionKey,
    storage_path: path,
    original_filename: file.name,
    uploaded_by: "owner",
  });

  revalidatePath(`/projects/${projectId}/intake`);
}

export async function deleteIntakeChecklistPhoto(projectId: string, photoId: string) {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("intake_checklist_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  await supabase.from("intake_checklist_photos").delete().eq("id", photoId);

  if (photo?.storage_path) {
    await deletePortalDocument(photo.storage_path);
  }

  revalidatePath(`/projects/${projectId}/intake`);
}
