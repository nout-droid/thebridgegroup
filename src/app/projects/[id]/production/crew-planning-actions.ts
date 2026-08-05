"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncCrewRatesCategory } from "@/lib/server/crew-rates";
import { estimateOneWayDistanceKm } from "@/lib/server/distance";
import { getProjectVenueAddress } from "@/lib/server/project-venue";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ProvidedBy = "wij" | "klant" | "leverancier";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/planning`);
  revalidatePath(`/projects/${projectId}/production`);
}

interface PositionFields {
  work_date: string;
  role: string;
  quantity: number;
  provided_by: ProvidedBy;
  supplier_id: string | null;
  stage_id: string | null;
  needs_accreditation: boolean;
  needs_catering: boolean;
  needs_hotel: boolean;
  needs_flight: boolean;
  notes: string;
}

function parseFormFields(formData: FormData): PositionFields {
  const providedByRaw = String(formData.get("provided_by") ?? "wij");
  const providedBy: ProvidedBy = (["wij", "klant", "leverancier"] as const).includes(
    providedByRaw as ProvidedBy
  )
    ? (providedByRaw as ProvidedBy)
    : "wij";

  return {
    work_date: String(formData.get("work_date") ?? ""),
    role: String(formData.get("role") ?? "").trim(),
    quantity: Math.max(1, Number(formData.get("quantity") ?? 1)),
    provided_by: providedBy,
    supplier_id: providedBy === "leverancier" ? String(formData.get("supplier_id") ?? "") || null : null,
    stage_id: String(formData.get("stage_id") ?? "") || null,
    needs_accreditation: formData.get("needs_accreditation") === "on",
    needs_catering: formData.get("needs_catering") === "on",
    needs_hotel: formData.get("needs_hotel") === "on",
    needs_flight: formData.get("needs_flight") === "on",
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

// Reconcileert crew_members-rijen naar de gevraagde quantity van een positie — onafhankelijk
// van needs_accreditation. Deze rijen zijn nu de algemene "wie is hieraan gekoppeld"-registratie
// (naam, tarieven) voor Planning; needs_accreditation bepaalt alleen of iemand ook badge/
// toegangsniveau-velden in Crew & Accreditatie moet invullen, niet of de rij zelf bestaat.
async function syncCrewMembersForPosition(
  supabase: SupabaseServerClient,
  position: { id: string; project_id: string } & PositionFields
) {
  const { data: existing } = await supabase
    .from("crew_members")
    .select("id, name")
    .eq("crew_position_id", position.id);

  const rows = existing ?? [];

  if (rows.length < position.quantity) {
    const toCreate = position.quantity - rows.length;
    const { count } = await supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", position.project_id);
    const startSortOrder = count ?? 0;

    await supabase.from("crew_members").insert(
      Array.from({ length: toCreate }, (_, i) => ({
        project_id: position.project_id,
        crew_position_id: position.id,
        name: "",
        role: position.role,
        supplier_id: position.supplier_id,
        access_dates: [position.work_date],
        needs_catering: position.needs_catering,
        needs_hotel: position.needs_hotel,
        needs_flight: position.needs_flight,
        accredited: false,
        sort_order: startSortOrder + i,
      }))
    );
  } else if (rows.length > position.quantity) {
    const surplus = rows.length - position.quantity;
    const unnamed = rows
      .filter((row) => !row.name)
      .map((row) => row.id)
      .slice(0, surplus);
    if (unnamed.length) {
      await supabase.from("crew_members").delete().in("id", unnamed);
    }
  }
}

export async function addCrewPosition(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.work_date || !fields.role) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("crew_positions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: created } = await supabase
    .from("crew_positions")
    .insert({ project_id: projectId, ...fields, sort_order: count ?? 0 })
    .select("id")
    .single();

  if (created) {
    await syncCrewMembersForPosition(supabase, { id: created.id, project_id: projectId, ...fields });
  }

  revalidate(projectId);
}

export async function updateCrewPosition(projectId: string, positionId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.work_date || !fields.role) return;

  const supabase = await createClient();
  await supabase.from("crew_positions").update(fields).eq("id", positionId);

  await syncCrewMembersForPosition(supabase, { id: positionId, project_id: projectId, ...fields });

  revalidate(projectId);
}

export async function deleteCrewPosition(projectId: string, positionId: string) {
  const supabase = await createClient();

  const { data: unnamed } = await supabase
    .from("crew_members")
    .select("id")
    .eq("crew_position_id", positionId)
    .eq("name", "");
  if (unnamed?.length) {
    await supabase.from("crew_members").delete().in("id", unnamed.map((row) => row.id));
  }

  await supabase.from("crew_positions").delete().eq("id", positionId);
  revalidate(projectId);
}

function optionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

// Slaat naam + tarieven op een plaatshoudersrij op, vanuit Planning zelf — of de gebruiker nu
// een bestaande freelancer koos (velden vooringevuld, met freelancer_id) of iemand die niet in
// de database staat handmatig invoert (freelancer_id blijft leeg). In tegenstelling tot
// linkFreelancerToPosition (die altijd de actuele freelancer-tarieven overneemt) blijven hier
// de door de planner eventueel aangepaste tarieven leidend — bewust, want soms wijkt het tarief
// voor deze ene klus af van iemands standaardtarief in de database.
export async function savePositionMember(projectId: string, memberId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const freelancerId = String(formData.get("freelancer_id") ?? "") || null;
  const role = String(formData.get("role") ?? "").trim();
  const homeAddress = String(formData.get("home_address") ?? "").trim();
  const dayRate = Math.max(0, Number(formData.get("day_rate") ?? 0));
  const overtimeRate = Math.max(0, Number(formData.get("overtime_rate") ?? 0));
  const kmRate = Math.max(0, Number(formData.get("km_rate") ?? 0));
  const sellDayRate = optionalNumber(formData, "sell_day_rate");
  const sellOvertimeRate = optionalNumber(formData, "sell_overtime_rate");
  const sellKmRate = optionalNumber(formData, "sell_km_rate");

  const supabase = await createClient();

  const { data: member } = await supabase
    .from("crew_members")
    .select("access_dates")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return;

  if (freelancerId) {
    const accessDates = member.access_dates ?? [];
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
        .neq("id", memberId)
        .returns<{ access_dates: string[]; project: { name: string } | null }[]>(),
    ]);

    const blockedByAvailability = (unavailablePeriods ?? []).some((period) =>
      accessDates.some((date: string) => date >= period.start_date && date <= period.end_date)
    );
    const conflictingProject = (existingAssignments ?? []).find((row) =>
      (row.access_dates ?? []).some((date: string) => accessDates.includes(date))
    );

    if (blockedByAvailability || conflictingProject) {
      const reason = blockedByAvailability
        ? "Deze persoon staat als niet beschikbaar geregistreerd op (een deel van) deze datums."
        : `Deze persoon is al ingepland op "${conflictingProject?.project?.name ?? "een ander project"}" op (een deel van) deze datums.`;
      redirect(`/projects/${projectId}/production/planning?error=${encodeURIComponent(reason)}`);
    }
  }

  const venueAddress = await getProjectVenueAddress(supabase, projectId);
  const distanceKm = venueAddress ? await estimateOneWayDistanceKm(homeAddress, venueAddress) : null;

  await supabase
    .from("crew_members")
    .update({
      name,
      role,
      home_address: homeAddress,
      day_rate: dayRate,
      overtime_rate: overtimeRate,
      km_rate: kmRate,
      sell_day_rate: sellDayRate,
      sell_overtime_rate: sellOvertimeRate,
      sell_km_rate: sellKmRate,
      distance_km: distanceKm,
      freelancer_id: freelancerId,
    })
    .eq("id", memberId);

  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
  revalidatePath(`/projects/${projectId}/budget`);
}

// Ontkoppelt een gekoppelde persoon van een positie: zet de rij terug naar een lege
// plaatshouder (naam + tarieven + freelancer_id gewist) i.p.v. de rij te verwijderen, zodat het
// aantal rijen gelijk blijft aan de gevraagde quantity van de positie.
export async function unlinkCrewPosition(projectId: string, memberId: string) {
  const supabase = await createClient();
  await supabase
    .from("crew_members")
    .update({
      name: "",
      freelancer_id: null,
      day_rate: 0,
      overtime_rate: 0,
      overtime_hours: 0,
      km_rate: 0,
      sell_day_rate: null,
      sell_overtime_rate: null,
      sell_km_rate: null,
      home_address: "",
      distance_km: null,
      skills: [],
    })
    .eq("id", memberId);

  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
  revalidatePath(`/projects/${projectId}/budget`);
}
