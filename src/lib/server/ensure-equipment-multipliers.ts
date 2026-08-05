import "server-only";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EquipmentRentalMultiplier } from "@/lib/types";

// Startwaarden gelijk aan de gedeelde rental_period_multipliers-tabel (de externe
// verhuurcatalogus) — puur als redelijk startpunt, hierna volledig los te bewerken per
// organisatie via /equipment.
const DEFAULT_MULTIPLIERS: { min_days: number; label: string; multiplier: number }[] = [
  { min_days: 1, label: "1 dag", multiplier: 1 },
  { min_days: 2, label: "2 dagen", multiplier: 1 },
  { min_days: 3, label: "3 dagen", multiplier: 1 },
  { min_days: 4, label: "4 dagen", multiplier: 1 },
  { min_days: 5, label: "5 dagen", multiplier: 1.05 },
  { min_days: 6, label: "6 dagen", multiplier: 1.15 },
  { min_days: 7, label: "7 dagen", multiplier: 1.25 },
  { min_days: 8, label: "8 dagen", multiplier: 1.32 },
  { min_days: 9, label: "9 dagen", multiplier: 1.39 },
  { min_days: 10, label: "10 dagen", multiplier: 1.46 },
  { min_days: 14, label: "14 dagen", multiplier: 1.75 },
  { min_days: 21, label: "21 dagen", multiplier: 2.25 },
  { min_days: 28, label: "4 weken", multiplier: 2.75 },
];

export async function ensureEquipmentRentalMultipliers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string
): Promise<EquipmentRentalMultiplier[]> {
  const { data: existing } = await supabase
    .from("equipment_rental_period_multipliers")
    .select("*")
    .eq("owner_user_id", ownerId)
    .order("min_days", { ascending: true })
    .returns<EquipmentRentalMultiplier[]>();

  if (existing && existing.length > 0) return existing;

  const { data: inserted } = await supabase
    .from("equipment_rental_period_multipliers")
    .insert(DEFAULT_MULTIPLIERS.map((m) => ({ owner_user_id: ownerId, ...m })))
    .select("*")
    .returns<EquipmentRentalMultiplier[]>();

  return (inserted ?? []).sort((a, b) => a.min_days - b.min_days);
}

// Zelfde staffel-logica als de SQL-functie equipment_rental_multiplier: de tier met de
// hoogste min_days <= days. Hiermee kan de multiplier lokaal berekend worden zodra de
// volledige tierlijst al is opgehaald, zonder een RPC-call per uniek aantal dagen.
export function computeEquipmentMultiplier(tiers: EquipmentRentalMultiplier[], days: number): number {
  const applicable = tiers
    .filter((t) => t.min_days <= days)
    .sort((a, b) => b.min_days - a.min_days)[0];
  return applicable?.multiplier ?? 1;
}
