"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/artiesten`);
}

export async function addArtistCrewMember(
  projectId: string,
  artistRiderId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const role = String(formData.get("role") ?? "").trim();
  const needsCatering = formData.get("needs_catering") === "on";
  const needsHotel = formData.get("needs_hotel") === "on";

  const supabase = await createClient();
  const { count } = await supabase
    .from("crew_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("crew_members").insert({
    project_id: projectId,
    artist_rider_id: artistRiderId,
    name,
    role,
    needs_catering: needsCatering,
    needs_hotel: needsHotel,
    accredited: false,
    access_dates: [],
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateArtistCrewMember(
  projectId: string,
  memberId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const role = String(formData.get("role") ?? "").trim();
  const needsCatering = formData.get("needs_catering") === "on";
  const needsHotel = formData.get("needs_hotel") === "on";

  const supabase = await createClient();
  await supabase
    .from("crew_members")
    .update({ name, role, needs_catering: needsCatering, needs_hotel: needsHotel })
    .eq("id", memberId);

  revalidate(projectId);
}

export async function deleteArtistCrewMember(projectId: string, memberId: string) {
  const supabase = await createClient();
  await supabase.from("crew_members").delete().eq("id", memberId);
  revalidate(projectId);
}
