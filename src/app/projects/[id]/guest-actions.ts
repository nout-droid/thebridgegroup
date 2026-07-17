"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { removeFromStorage, uploadToStorage } from "@/lib/supabase/storage-rest";

const BUCKET = "portal-documents";

export async function setGuestPassword(projectId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_guest_password", { p_project_id: projectId, p_password: password });

  revalidatePath(`/projects/${projectId}/guests`);
}

export async function uploadGuestDocument(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!title || !(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const path = `guests/${projectId}/${Date.now()}-${file.name}`;

  const ok = await uploadToStorage(supabase, BUCKET, path, file);
  if (!ok) return;

  await supabase.from("guest_documents").insert({
    project_id: projectId,
    title,
    storage_path: path,
    original_filename: file.name,
  });

  revalidatePath(`/projects/${projectId}/guests`);
}

export async function deleteGuestDocument(projectId: string, documentId: string) {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("guest_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  await supabase.from("guest_documents").delete().eq("id", documentId);

  if (document?.storage_path) {
    await removeFromStorage(supabase, BUCKET, [document.storage_path]);
  }

  revalidatePath(`/projects/${projectId}/guests`);
}
