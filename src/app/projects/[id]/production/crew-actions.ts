"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory } from "@/lib/server/category-helpers";
import { estimateOneWayDistanceKm } from "@/lib/server/distance";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production`);
  revalidatePath(`/projects/${projectId}/budget`);
}

async function getProjectVenueAddress(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<string | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("venue_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.venue_id) return null;

  const { data: venue } = await supabase
    .from("venues")
    .select("address")
    .eq("id", project.venue_id)
    .maybeSingle();
  return venue?.address ?? null;
}

// Vergoeding per crewlid = dagtarief x aantal toegangsdagen, plus overurentarief x
// overuren, plus KM-vergoeding x reisafstand (retour) x aantal toegangsdagen. Som over
// iedereen met een naam (geen lege accreditatie-placeholders) landt als stelpost op een
// aparte "Crew vergoeding"-categorie — zelfde patroon als syncSejoursCategory voor
// per_diem_rate in hotel-actions.ts.
async function syncCrewRatesCategory(supabase: SupabaseServerClient, projectId: string) {
  const { data: members } = await supabase
    .from("crew_members")
    .select("name, access_dates, day_rate, overtime_rate, overtime_hours, km_rate, distance_km")
    .eq("project_id", projectId);

  const total = (members ?? []).reduce((sum, member) => {
    if (!member.name) return sum;
    const days = (member.access_dates ?? []).length;
    const dayCost = (member.day_rate ?? 0) * days;
    const overtimeCost = (member.overtime_rate ?? 0) * (member.overtime_hours ?? 0);
    const kmCost = (member.km_rate ?? 0) * (member.distance_km ?? 0) * 2 * days;
    return sum + dayCost + overtimeCost + kmCost;
  }, 0);

  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Crew vergoeding");
  if (categoryId) {
    await supabase.from("categories").update({ manual_cost: total }).eq("id", categoryId);
  }
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
