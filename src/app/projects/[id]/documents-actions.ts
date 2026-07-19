"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";

export async function uploadProjectDocument(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!title || !(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const path = `documents/${projectId}/${Date.now()}-${file.name}`;

  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await supabase.from("project_documents").insert({
    project_id: projectId,
    title,
    storage_path: path,
    original_filename: file.name,
  });

  revalidatePath(`/projects/${projectId}/documents`);
}

export async function deleteProjectDocument(projectId: string, documentId: string) {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  await supabase.from("project_documents").delete().eq("id", documentId);

  if (document?.storage_path) {
    await deletePortalDocument(document.storage_path);
  }

  revalidatePath(`/projects/${projectId}/documents`);
}
