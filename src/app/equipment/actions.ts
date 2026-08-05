"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { syncEquipmentCostCategory } from "@/lib/server/equipment-cost";
import { ensureEquipmentRentalMultipliers } from "@/lib/server/ensure-equipment-multipliers";

interface EquipmentItemFields {
  name: string;
  category: string;
  asset_number: string;
  quantity_owned: number;
  internal_day_rate: number;
  replacement_value: number;
  notes: string;
}

function parseItemFields(formData: FormData): EquipmentItemFields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    asset_number: String(formData.get("asset_number") ?? "").trim(),
    quantity_owned: Math.max(1, Number(formData.get("quantity_owned") ?? 1)),
    internal_day_rate: Math.max(0, Number(formData.get("internal_day_rate") ?? 0)),
    replacement_value: Math.max(0, Number(formData.get("replacement_value") ?? 0)),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createEquipmentItem(formData: FormData) {
  const fields = parseItemFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);
  await supabase.from("equipment_items").insert({ user_id: ownerId, ...fields });

  revalidatePath("/equipment");
}

export async function updateEquipmentItem(itemId: string, formData: FormData) {
  const fields = parseItemFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("equipment_items").update(fields).eq("id", itemId);

  revalidatePath("/equipment");
}

export async function deleteEquipmentItem(itemId: string) {
  const supabase = await createClient();
  await supabase.from("equipment_items").delete().eq("id", itemId);
  revalidatePath("/equipment");
}

// Boekt (een deel van) een materiaalitem op een project. Blokkeert (i.p.v. te negeren) als
// de gevraagde hoeveelheid, samen met al bestaande boekingen op overlappende dagen, de
// bezitshoeveelheid zou overschrijden — zelfde "waarschuwen, niet stilzwijgend toestaan"
// patroon als assignFreelancerToProject.
export async function bookEquipmentItem(itemId: string, formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const stageId = String(formData.get("stage_id") ?? "") || null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const accessDates = formData.getAll("access_dates").map(String);
  const notes = String(formData.get("notes") ?? "").trim();
  if (!projectId || !accessDates.length) return;

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("equipment_items")
    .select("quantity_owned, name")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return;

  const { data: existingBookings } = await supabase
    .from("equipment_bookings")
    .select("quantity, access_dates")
    .eq("equipment_item_id", itemId);

  const dateSet = new Set(accessDates);
  const alreadyBookedOverlap = (existingBookings ?? [])
    .filter((b) => (b.access_dates ?? []).some((d: string) => dateSet.has(d)))
    .reduce((sum, b) => sum + (b.quantity ?? 0), 0);

  if (alreadyBookedOverlap + quantity > item.quantity_owned) {
    const available = Math.max(0, item.quantity_owned - alreadyBookedOverlap);
    redirect(
      `/equipment?error=${encodeURIComponent(
        `Niet genoeg "${item.name}" beschikbaar op deze datums — nog ${available} van de ${item.quantity_owned} vrij.`
      )}`
    );
  }

  await supabase.from("equipment_bookings").insert({
    equipment_item_id: itemId,
    project_id: projectId,
    stage_id: stageId,
    quantity,
    access_dates: accessDates,
    notes,
  });

  await syncEquipmentCostCategory(supabase, projectId);

  revalidatePath("/equipment");
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}/production/materieel`);
}

export async function deleteEquipmentBooking(bookingId: string) {
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("equipment_bookings")
    .select("project_id")
    .eq("id", bookingId)
    .maybeSingle();

  await supabase.from("equipment_bookings").delete().eq("id", bookingId);

  if (booking?.project_id) {
    await syncEquipmentCostCategory(supabase, booking.project_id);
    revalidatePath(`/projects/${booking.project_id}/budget`);
  }

  revalidatePath("/equipment");
}

// Eigen, per-organisatie huurperiode-staffel voor materiaal — los van de externe
// verhuurcatalogus. Wijzigingen gelden voor nieuwe/opnieuw gesynchroniseerde boekingen; al
// gesynchroniseerde categoriekosten van bestaande boekingen worden niet met terugwerkende
// kracht herberekend (zelfde, al bestaande beperking als bij de externe staffel).
export async function addEquipmentMultiplierTier(formData: FormData) {
  const minDays = Math.max(1, Number(formData.get("min_days") ?? 0));
  const label = String(formData.get("label") ?? "").trim();
  const multiplier = Math.max(0, Number(formData.get("multiplier") ?? 1));
  if (!minDays || !label) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);
  await ensureEquipmentRentalMultipliers(supabase, ownerId);
  await supabase
    .from("equipment_rental_period_multipliers")
    .upsert(
      { owner_user_id: ownerId, min_days: minDays, label, multiplier },
      { onConflict: "owner_user_id,min_days" }
    );

  revalidatePath("/equipment");
}

export async function updateEquipmentMultiplierTier(tierId: string, formData: FormData) {
  const minDays = Math.max(1, Number(formData.get("min_days") ?? 0));
  const label = String(formData.get("label") ?? "").trim();
  const multiplier = Math.max(0, Number(formData.get("multiplier") ?? 1));
  if (!minDays || !label) return;

  const supabase = await createClient();
  await supabase
    .from("equipment_rental_period_multipliers")
    .update({ min_days: minDays, label, multiplier })
    .eq("id", tierId);

  revalidatePath("/equipment");
}

export async function deleteEquipmentMultiplierTier(tierId: string) {
  const supabase = await createClient();
  await supabase.from("equipment_rental_period_multipliers").delete().eq("id", tierId);
  revalidatePath("/equipment");
}
