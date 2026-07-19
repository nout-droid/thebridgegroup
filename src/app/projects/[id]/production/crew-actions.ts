"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production`);
}

export async function addCrewMember(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const role = String(formData.get("role") ?? "").trim();
  const accessLevel = String(formData.get("access_level") ?? "").trim();
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const accredited = formData.get("accredited") === "on";
  const needsCatering = formData.get("needs_catering") === "on";
  const needsHotel = formData.get("needs_hotel") === "on";
  const needsFlight = formData.get("needs_flight") === "on";
  const accessDates = formData.getAll("access_dates").map(String);

  const supabase = await createClient();
  const { count } = await supabase
    .from("crew_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("crew_members").insert({
    project_id: projectId,
    name,
    supplier_id: supplierId,
    role,
    access_level: accessLevel,
    id_number: idNumber,
    accredited,
    needs_catering: needsCatering,
    needs_hotel: needsHotel,
    needs_flight: needsFlight,
    access_dates: accessDates,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateCrewMember(projectId: string, memberId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const role = String(formData.get("role") ?? "").trim();
  const accessLevel = String(formData.get("access_level") ?? "").trim();
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const accredited = formData.get("accredited") === "on";
  const needsCatering = formData.get("needs_catering") === "on";
  const needsHotel = formData.get("needs_hotel") === "on";
  const needsFlight = formData.get("needs_flight") === "on";
  const accessDates = formData.getAll("access_dates").map(String);

  const supabase = await createClient();
  await supabase
    .from("crew_members")
    .update({
      name,
      supplier_id: supplierId,
      role,
      access_level: accessLevel,
      id_number: idNumber,
      accredited,
      needs_catering: needsCatering,
      needs_hotel: needsHotel,
      needs_flight: needsFlight,
      access_dates: accessDates,
    })
    .eq("id", memberId);

  revalidate(projectId);
}

export async function deleteCrewMember(projectId: string, memberId: string) {
  const supabase = await createClient();
  await supabase.from("crew_members").delete().eq("id", memberId);
  revalidate(projectId);
}
