import "server-only";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCategory } from "@/lib/server/category-helpers";

// Kosten van eigen materiaal = interne dagprijs x aantal x huurperiode-staffel, opgeteld over
// alle boekingen op dit project — landt als stelpost op een projectbrede "Materiaal (eigen)"
// categorie. Materiaal wordt normaliter niet per losse dag geprijsd maar via dezelfde
// staffel (rental_period_multipliers/rental_multiplier) als de externe verhuur-catalogus:
// de dagprijs is het basistarief voor de eerste periode (1-4 dagen), langere boekingen
// schalen op via de staffel i.p.v. lineair per dag te vermenigvuldigen.
export async function syncEquipmentCostCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
) {
  const { data: bookings } = await supabase
    .from("equipment_bookings")
    .select("quantity, access_dates, equipment_item:equipment_items(internal_day_rate)")
    .eq("project_id", projectId);

  const uniqueDayCounts = Array.from(
    new Set((bookings ?? []).map((booking: any) => (booking.access_dates ?? []).length).filter((d: number) => d > 0))
  );
  const multiplierByDays = new Map<number, number>();
  await Promise.all(
    uniqueDayCounts.map(async (days) => {
      const { data: multiplier } = await supabase.rpc("rental_multiplier", { p_days: days });
      multiplierByDays.set(days, multiplier ?? 1);
    })
  );

  const total = (bookings ?? []).reduce((sum: number, booking: any) => {
    const item = Array.isArray(booking.equipment_item) ? booking.equipment_item[0] : booking.equipment_item;
    const dayRate = item?.internal_day_rate ?? 0;
    const days = (booking.access_dates ?? []).length;
    const multiplier = multiplierByDays.get(days) ?? 1;
    return sum + dayRate * (booking.quantity ?? 0) * multiplier;
  }, 0);

  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Materiaal (eigen)");
  if (categoryId) {
    await supabase.from("categories").update({ manual_cost: total }).eq("id", categoryId);
  }
}
