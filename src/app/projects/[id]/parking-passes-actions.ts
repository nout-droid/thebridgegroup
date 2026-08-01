"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";

export async function uploadParkingPass(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!title || !(file instanceof File) || file.size === 0) return;

  const visibleToCrew = formData.get("visible_to_crew") === "on";
  const visibleToGuests = formData.get("visible_to_guests") === "on";
  const visibleToAttendees = formData.get("visible_to_attendees") === "on";

  const supabase = await createClient();
  const path = `parking/${projectId}/${Date.now()}-${file.name}`;

  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await supabase.from("parking_passes").insert({
    project_id: projectId,
    title,
    storage_path: path,
    visible_to_crew: visibleToCrew,
    visible_to_guests: visibleToGuests,
    visible_to_attendees: visibleToAttendees,
  });

  revalidatePath(`/projects/${projectId}/documents`);
}

export async function deleteParkingPass(projectId: string, passId: string) {
  const supabase = await createClient();

  const { data: pass } = await supabase
    .from("parking_passes")
    .select("storage_path")
    .eq("id", passId)
    .maybeSingle();

  await supabase.from("parking_passes").delete().eq("id", passId);

  if (pass?.storage_path) {
    await deletePortalDocument(pass.storage_path);
  }

  revalidatePath(`/projects/${projectId}/documents`);
}
