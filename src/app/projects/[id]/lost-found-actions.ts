"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";

export async function addLostFoundItem(projectId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("photo");
  if (!description) return;

  const supabase = await createClient();
  let photoPath: string | null = null;

  if (file instanceof File && file.size > 0) {
    photoPath = `lost-found/${projectId}/${Date.now()}-${file.name}`;
    const { error } = await uploadPortalDocument(photoPath, file);
    if (error) photoPath = null;
  }

  await supabase.from("lost_found_items").insert({
    project_id: projectId,
    description,
    photo_path: photoPath,
  });

  revalidatePath(`/projects/${projectId}/documents`);
}

export async function updateLostFoundStatus(projectId: string, itemId: string, status: string) {
  const supabase = await createClient();
  await supabase.from("lost_found_items").update({ status }).eq("id", itemId);
  revalidatePath(`/projects/${projectId}/documents`);
}

export async function deleteLostFoundItem(projectId: string, itemId: string) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("lost_found_items")
    .select("photo_path")
    .eq("id", itemId)
    .maybeSingle();

  await supabase.from("lost_found_items").delete().eq("id", itemId);

  if (item?.photo_path) {
    await deletePortalDocument(item.photo_path);
  }

  revalidatePath(`/projects/${projectId}/documents`);
}
