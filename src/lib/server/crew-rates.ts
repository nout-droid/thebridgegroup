import "server-only";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCategory } from "@/lib/server/category-helpers";

// Vergoeding per crewlid = dagtarief x aantal toegangsdagen, plus overurentarief x
// overuren, plus KM-vergoeding x reisafstand (retour) x aantal toegangsdagen. Som over
// iedereen met een naam (geen lege plaatshouders) én zonder supplier_id landt als stelpost op
// een aparte "Crew vergoeding"-categorie — zelfde patroon als syncSejoursCategory voor
// per_diem_rate in hotel-actions.ts. Een supplier_id betekent dat dit iemand van een
// leverancier is die in Crew & Accreditatie alleen wordt geaccrediteerd (badge/toegang) — wij
// betalen die persoon niet, dus die telt niet mee in onze interne crewkosten, ook niet als er
// per ongeluk tarieven op die rij staan.
export async function syncCrewRatesCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
) {
  const { data: members } = await supabase
    .from("crew_members")
    .select("name, supplier_id, access_dates, day_rate, overtime_rate, overtime_hours, km_rate, distance_km")
    .eq("project_id", projectId);

  const total = (members ?? []).reduce((sum: number, member) => {
    if (!member.name || member.supplier_id) return sum;
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
