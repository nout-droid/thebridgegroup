"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estimateOneWayDistanceKm } from "@/lib/server/distance";
import { getProjectVenueAddress } from "@/lib/server/project-venue";
import { syncCrewRatesCategory } from "@/lib/server/crew-rates";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production`);
  revalidatePath(`/projects/${projectId}/budget`);
}

interface MemberFields {
  name: string;
  supplier_id: string | null;
  role: string;
  access_level: string;
  id_number: string;
  accredited: boolean;
  needs_catering: boolean;
  needs_hotel: boolean;
  needs_flight: boolean;
  access_dates: string[];
  skills: string[];
  day_rate: number;
  overtime_rate: number;
  overtime_hours: number;
  home_address: string;
  km_rate: number;
  freelancer_id: string | null;
}

function parseMemberFields(formData: FormData): MemberFields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    role: String(formData.get("role") ?? "").trim(),
    access_level: String(formData.get("access_level") ?? "").trim(),
    id_number: String(formData.get("id_number") ?? "").trim(),
    accredited: formData.get("accredited") === "on",
    needs_catering: formData.get("needs_catering") === "on",
    needs_hotel: formData.get("needs_hotel") === "on",
    needs_flight: formData.get("needs_flight") === "on",
    access_dates: formData.getAll("access_dates").map(String),
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    day_rate: Math.max(0, Number(formData.get("day_rate") ?? 0)),
    overtime_rate: Math.max(0, Number(formData.get("overtime_rate") ?? 0)),
    overtime_hours: Math.max(0, Number(formData.get("overtime_hours") ?? 0)),
    home_address: String(formData.get("home_address") ?? "").trim(),
    km_rate: Math.max(0, Number(formData.get("km_rate") ?? 0)),
    freelancer_id: String(formData.get("freelancer_id") ?? "") || null,
  };
}

export async function addCrewMember(projectId: string, formData: FormData) {
  const fields = parseMemberFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const venueAddress = await getProjectVenueAddress(supabase, projectId);
  const distanceKm = venueAddress
    ? await estimateOneWayDistanceKm(fields.home_address, venueAddress)
    : null;

  const { count } = await supabase
    .from("crew_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("crew_members").insert({
    project_id: projectId,
    ...fields,
    distance_km: distanceKm,
    sort_order: count ?? 0,
  });

  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
}

export async function updateCrewMember(projectId: string, memberId: string, formData: FormData) {
  const fields = parseMemberFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const venueAddress = await getProjectVenueAddress(supabase, projectId);
  const distanceKm = venueAddress
    ? await estimateOneWayDistanceKm(fields.home_address, venueAddress)
    : null;

  await supabase
    .from("crew_members")
    .update({ ...fields, distance_km: distanceKm })
    .eq("id", memberId);

  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
}

export async function deleteCrewMember(projectId: string, memberId: string) {
  const supabase = await createClient();
  await supabase.from("crew_members").delete().eq("id", memberId);
  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
}
