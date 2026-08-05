import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateOneWayDistanceKm } from "@/lib/server/distance";
import { getProjectVenueAddress } from "@/lib/server/project-venue";
import { syncCrewRatesCategory } from "@/lib/server/crew-rates";

type LinkResult = { ok: true; projectId: string } | { ok: false; reason: string };

// Kern van "koppel een freelancer aan een openstaande functie" — gedeeld tussen de Planning-tab
// (crew-planning-actions.ts, blijft op dezelfde pagina) en het cross-project "Openstaande
// functies"-overzicht (freelancers/actions.ts::fillCrewPosition, redirect't terug naar
// /freelancers). Vult de bestaande naamloze plaatshouder-rij in (aangemaakt door
// syncCrewMembersForPosition) i.p.v. een extra rij toe te voegen, zodat het aantal rijen gelijk
// blijft aan de gevraagde quantity. Neemt zowel de inkoop- als de (optionele) verkoopprijs over
// van het freelancer-record, als snapshot op het moment van koppelen.
export async function linkFreelancerToPosition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  positionId: string,
  freelancerId: string
): Promise<LinkResult> {
  const { data: position } = await supabase
    .from("crew_positions")
    .select("id, project_id, work_date, role")
    .eq("id", positionId)
    .maybeSingle();
  if (!position) return { ok: false, reason: "Positie niet gevonden." };

  const { data: freelancer } = await supabase
    .from("freelancers")
    .select("*")
    .eq("id", freelancerId)
    .maybeSingle();
  if (!freelancer) return { ok: false, reason: "Persoon niet gevonden." };

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
    return {
      ok: false,
      reason: blockedByAvailability
        ? "Deze persoon staat als niet beschikbaar geregistreerd op deze datum."
        : `Deze persoon is al ingepland op "${conflictingProject?.project?.name ?? "een ander project"}" op deze datum.`,
    };
  }

  const venueAddress = await getProjectVenueAddress(supabase, position.project_id);
  const distanceKm = venueAddress
    ? await estimateOneWayDistanceKm(freelancer.home_address, venueAddress)
    : null;

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
    sell_day_rate: freelancer.sell_day_rate,
    sell_overtime_rate: freelancer.sell_overtime_rate,
    sell_km_rate: freelancer.sell_km_rate,
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

  return { ok: true, projectId: position.project_id };
}
