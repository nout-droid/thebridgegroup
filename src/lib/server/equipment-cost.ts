import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCategory } from "@/lib/server/category-helpers";
import { computeEquipmentMultiplier, ensureEquipmentRentalMultipliers } from "@/lib/server/ensure-equipment-multipliers";

// Kosten van eigen materiaal = interne dagprijs x aantal x huurperiode-staffel, opgeteld over
// alle boekingen op dit project — landt als stelpost op een projectbrede "Materiaal (eigen)"
// categorie. Materiaal wordt niet lineair per dag geprijsd maar via een eigen, per organisatie
// bewerkbare staffel (equipment_rental_period_multipliers, los van de externe verhuurcatalogus):
// de dagprijs is het basistarief voor de eerste periode, langere boekingen schalen op.
export async function syncEquipmentCostCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
) {
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const { data: bookings } = await supabase
    .from("equipment_bookings")
    .select("quantity, access_dates, equipment_item:equipment_items(internal_day_rate)")
    .eq("project_id", projectId);

  const tiers = await ensureEquipmentRentalMultipliers(supabase, project.user_id);

  interface BookingRow {
    quantity: number | null;
    access_dates: string[] | null;
    equipment_item: { internal_day_rate: number | null } | { internal_day_rate: number | null }[] | null;
  }

  const total = (bookings ?? []).reduce((sum: number, booking: BookingRow) => {
    const item = Array.isArray(booking.equipment_item) ? booking.equipment_item[0] : booking.equipment_item;
    const dayRate = item?.internal_day_rate ?? 0;
    const days = (booking.access_dates ?? []).length;
    const multiplier = computeEquipmentMultiplier(tiers, days);
    return sum + dayRate * (booking.quantity ?? 0) * multiplier;
  }, 0);

  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Materiaal (eigen)");
  if (categoryId) {
    await supabase.from("categories").update({ manual_cost: total }).eq("id", categoryId);
  }
}
