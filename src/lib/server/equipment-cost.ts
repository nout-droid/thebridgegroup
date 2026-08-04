import "server-only";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCategory } from "@/lib/server/category-helpers";

// Kosten van eigen materiaal = interne dagprijs x aantal x aantal dagen, opgeteld over alle
// boekingen op dit project — landt als stelpost op een projectbrede "Materiaal (eigen)"
// categorie. Zelfde patroon als syncCrewRatesCategory.
export async function syncEquipmentCostCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
) {
  const { data: bookings } = await supabase
    .from("equipment_bookings")
    .select("quantity, access_dates, equipment_item:equipment_items(internal_day_rate)")
    .eq("project_id", projectId);

  const total = (bookings ?? []).reduce((sum: number, booking: any) => {
    const item = Array.isArray(booking.equipment_item) ? booking.equipment_item[0] : booking.equipment_item;
    const dayRate = item?.internal_day_rate ?? 0;
    const days = (booking.access_dates ?? []).length;
    return sum + dayRate * (booking.quantity ?? 0) * days;
  }, 0);

  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Materiaal (eigen)");
  if (categoryId) {
    await supabase.from("categories").update({ manual_cost: total }).eq("id", categoryId);
  }
}
