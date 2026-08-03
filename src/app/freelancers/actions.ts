"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { estimateOneWayDistanceKm } from "@/lib/server/distance";
import { getProjectVenueAddress } from "@/lib/server/project-venue";
import { syncCrewRatesCategory } from "@/lib/server/crew-rates";
import type { FreelancerAvailabilityStatus } from "@/lib/types";

interface FreelancerFields {
  name: string;
  role: string;
  email: string;
  phone: string;
  home_address: string;
  day_rate: number;
  overtime_rate: number;
  km_rate: number;
  skills: string[];
  notes: string;
}

function parseFreelancerFields(formData: FormData): FreelancerFields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    home_address: String(formData.get("home_address") ?? "").trim(),
    day_rate: Math.max(0, Number(formData.get("day_rate") ?? 0)),
    overtime_rate: Math.max(0, Number(formData.get("overtime_rate") ?? 0)),
    km_rate: Math.max(0, Number(formData.get("km_rate") ?? 0)),
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createFreelancer(formData: FormData) {
  const fields = parseFreelancerFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);
  await supabase.from("freelancers").insert({ user_id: ownerId, ...fields });

  revalidatePath("/freelancers");
}

export async function updateFreelancer(freelancerId: string, formData: FormData) {
  const fields = parseFreelancerFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("freelancers").update(fields).eq("id", freelancerId);

  revalidatePath("/freelancers");
}

export async function deleteFreelancer(freelancerId: string) {
  const supabase = await createClient();
  await supabase.from("freelancers").delete().eq("id", freelancerId);
  revalidatePath("/freelancers");
}

export async function addAvailability(freelancerId: string, formData: FormData) {
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "") || startDate;
  if (!startDate) return;

  const statusRaw = String(formData.get("status") ?? "unavailable");
  const status: FreelancerAvailabilityStatus = statusRaw === "available" ? "available" : "unavailable";

  const supabase = await createClient();
  await supabase.from("freelancer_availability").insert({
    freelancer_id: freelancerId,
    start_date: startDate,
    end_date: endDate,
    status,
    note: String(formData.get("note") ?? "").trim(),
  });

  revalidatePath("/freelancers");
}

export async function deleteAvailability(availabilityId: string) {
  const supabase = await createClient();
  await supabase.from("freelancer_availability").delete().eq("id", availabilityId);
  revalidatePath("/freelancers");
}

// Wijst een crewlid uit de centrale database toe aan een project: maakt een crew_members-
// rij aan (dezelfde tabel als bij handmatig toevoegen op het project zelf), met tarieven +
// woonadres overgenomen van het freelancer-record en freelancer_id gekoppeld, zodat één
// persoon over meerdere projecten dezelfde identiteit + tarief-geschiedenis behoudt.
// Waarschuwt (i.p.v. blokkeert) bij een dubbele boeking: overlappende "niet beschikbaar"-
// periode, of al ingepland op een ander project binnen dezelfde datums.
export async function assignFreelancerToProject(freelancerId: string, formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const stageId = String(formData.get("stage_id") ?? "") || null;
  const role = String(formData.get("role") ?? "").trim();
  const accessDates = formData.getAll("access_dates").map(String);
  if (!projectId || !accessDates.length) return;

  const supabase = await createClient();

  const { data: freelancer } = await supabase
    .from("freelancers")
    .select("*")
    .eq("id", freelancerId)
    .maybeSingle();
  if (!freelancer) return;

  const dateSet = new Set(accessDates);

  const [{ data: unavailablePeriods }, { data: existingAssignments }] = await Promise.all([
    supabase
      .from("freelancer_availability")
      .select("start_date, end_date")
      .eq("freelancer_id", freelancerId)
      .eq("status", "unavailable"),
    supabase
      .from("crew_members")
      .select("access_dates, project:projects(name)")
      .eq("freelancer_id", freelancerId)
      .returns<{ access_dates: string[]; project: { name: string } | null }[]>(),
  ]);

  const blockedByAvailability = (unavailablePeriods ?? []).some((period) =>
    accessDates.some((date) => date >= period.start_date && date <= period.end_date)
  );
  const conflictingProject = (existingAssignments ?? []).find((row) =>
    (row.access_dates ?? []).some((date) => dateSet.has(date))
  );

  if (blockedByAvailability || conflictingProject) {
    const reason = blockedByAvailability
      ? "Deze persoon staat als niet beschikbaar geregistreerd op (een deel van) deze datums."
      : `Deze persoon is al ingepland op "${conflictingProject?.project?.name ?? "een ander project"}" op (een deel van) deze datums.`;
    redirect(`/freelancers?error=${encodeURIComponent(reason)}`);
  }

  const venueAddress = await getProjectVenueAddress(supabase, projectId);
  const distanceKm = venueAddress
    ? await estimateOneWayDistanceKm(freelancer.home_address, venueAddress)
    : null;

  const { count } = await supabase
    .from("crew_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("crew_members").insert({
    project_id: projectId,
    freelancer_id: freelancerId,
    name: freelancer.name,
    role: role || freelancer.role,
    access_dates: accessDates,
    day_rate: freelancer.day_rate,
    overtime_rate: freelancer.overtime_rate,
    km_rate: freelancer.km_rate,
    home_address: freelancer.home_address,
    distance_km: distanceKm,
    skills: freelancer.skills,
    sort_order: count ?? 0,
  });

  await syncCrewRatesCategory(supabase, projectId);

  revalidatePath("/freelancers");
  revalidatePath(`/projects/${projectId}/production`);
  revalidatePath(`/projects/${projectId}/budget`);
  redirect(stageId ? `/projects/${projectId}/stages/${stageId}` : `/projects/${projectId}/production`);
}

// Vult een specifieke openstaande functie (crew_positions-rij) rechtstreeks in vanaf het
// planners-dashboard (/freelancers) — de planner hoeft daarvoor niet meer naar het project
// zelf te navigeren. Project, rol en datum liggen al vast op de positie; alleen de persoon
// wordt hier gekozen. Zelfde dubbele-boeking-check als assignFreelancerToProject hierboven.
export async function fillCrewPosition(positionId: string, formData: FormData) {
  const freelancerId = String(formData.get("freelancer_id") ?? "");
  if (!freelancerId) return;

  const supabase = await createClient();

  const { data: position } = await supabase
    .from("crew_positions")
    .select("id, project_id, work_date, role")
    .eq("id", positionId)
    .maybeSingle();
  if (!position) return;

  const { data: freelancer } = await supabase
    .from("freelancers")
    .select("*")
    .eq("id", freelancerId)
    .maybeSingle();
  if (!freelancer) return;

  const accessDates = [position.work_date];

  const [{ data: unavailablePeriods }, { data: existingAssignments }] = await Promise.all([
    supabase
      .from("freelancer_availability")
      .select("start_date, end_date")
      .eq("freelancer_id", freelancerId)
      .eq("status", "unavailable"),
    supabase
      .from("crew_members")
      .select("access_dates, project:projects(name)")
      .eq("freelancer_id", freelancerId)
      .returns<{ access_dates: string[]; project: { name: string } | null }[]>(),
  ]);

  const blockedByAvailability = (unavailablePeriods ?? []).some((period) =>
    accessDates.some((date) => date >= period.start_date && date <= period.end_date)
  );
  const conflictingProject = (existingAssignments ?? []).find((row) =>
    (row.access_dates ?? []).some((date) => accessDates.includes(date))
  );

  if (blockedByAvailability || conflictingProject) {
    const reason = blockedByAvailability
      ? "Deze persoon staat als niet beschikbaar geregistreerd op deze datum."
      : `Deze persoon is al ingepland op "${conflictingProject?.project?.name ?? "een ander project"}" op deze datum.`;
    redirect(`/freelancers?error=${encodeURIComponent(reason)}`);
  }

  const venueAddress = await getProjectVenueAddress(supabase, position.project_id);
  const distanceKm = venueAddress
    ? await estimateOneWayDistanceKm(freelancer.home_address, venueAddress)
    : null;

  // Als er al een naamloze plaatshouder-rij voor deze positie bestaat (aangemaakt via de
  // needs_accreditation-sync op het project zelf), vullen we die in i.p.v. een extra rij toe
  // te voegen — zo blijft het aantal rijen gelijk aan de gevraagde quantity.
  const { data: placeholder } = await supabase
    .from("crew_members")
    .select("id")
    .eq("crew_position_id", positionId)
    .eq("name", "")
    .limit(1)
    .maybeSingle();

  const memberFields = {
    project_id: position.project_id,
    crew_position_id: positionId,
    freelancer_id: freelancerId,
    name: freelancer.name,
    role: position.role || freelancer.role,
    access_dates: accessDates,
    day_rate: freelancer.day_rate,
    overtime_rate: freelancer.overtime_rate,
    km_rate: freelancer.km_rate,
    home_address: freelancer.home_address,
    distance_km: distanceKm,
    skills: freelancer.skills,
  };

  if (placeholder) {
    await supabase.from("crew_members").update(memberFields).eq("id", placeholder.id);
  } else {
    const { count } = await supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", position.project_id);
    await supabase.from("crew_members").insert({ ...memberFields, sort_order: count ?? 0 });
  }

  await syncCrewRatesCategory(supabase, position.project_id);

  revalidatePath("/freelancers");
  revalidatePath(`/projects/${position.project_id}/production`);
  revalidatePath(`/projects/${position.project_id}/production/planning`);
  revalidatePath(`/projects/${position.project_id}/budget`);
  redirect("/freelancers");
}
