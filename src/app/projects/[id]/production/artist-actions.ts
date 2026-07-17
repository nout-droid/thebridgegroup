"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/artiesten`);
}

function parseFormFields(formData: FormData) {
  return {
    artist_name: String(formData.get("artist_name") ?? "").trim(),
    rider_received: formData.get("rider_received") === "on",
    notes: String(formData.get("notes") ?? "").trim(),
    own_light_operator: formData.get("own_light_operator") === "on",
    own_audio_operator: formData.get("own_audio_operator") === "on",
    rider_link: String(formData.get("rider_link") ?? "").trim(),
  };
}

export async function addArtistRider(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.artist_name) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("artist_riders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("artist_riders").insert({
    project_id: projectId,
    ...fields,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateArtistRider(projectId: string, artistId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.artist_name) return;

  const supabase = await createClient();
  await supabase.from("artist_riders").update(fields).eq("id", artistId);

  revalidate(projectId);
}

export async function deleteArtistRider(projectId: string, artistId: string) {
  const supabase = await createClient();
  await supabase.from("artist_riders").delete().eq("id", artistId);
  revalidate(projectId);
}
