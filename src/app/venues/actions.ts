"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function optionalInt(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

export async function createVenue(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const ownerId = await getTeamOwnerId(supabase, user.id);

  await supabase.from("venues").insert({
    user_id: ownerId,
    name,
    address: optionalText(formData, "address"),
    capacity: optionalInt(formData, "capacity"),
    power_availability: optionalText(formData, "power_availability"),
    load_in_access: optionalText(formData, "load_in_access"),
    dimensions: optionalText(formData, "dimensions"),
    rigging_notes: optionalText(formData, "rigging_notes"),
    wifi_notes: optionalText(formData, "wifi_notes"),
    contact_name: optionalText(formData, "contact_name"),
    contact_email: optionalText(formData, "contact_email"),
    contact_phone: optionalText(formData, "contact_phone"),
    notes: optionalText(formData, "notes"),
  });

  revalidatePath("/venues");
}

export async function updateVenue(venueId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("venues")
    .update({
      name,
      address: optionalText(formData, "address"),
      capacity: optionalInt(formData, "capacity"),
      power_availability: optionalText(formData, "power_availability"),
      load_in_access: optionalText(formData, "load_in_access"),
      dimensions: optionalText(formData, "dimensions"),
      rigging_notes: optionalText(formData, "rigging_notes"),
      wifi_notes: optionalText(formData, "wifi_notes"),
      contact_name: optionalText(formData, "contact_name"),
      contact_email: optionalText(formData, "contact_email"),
      contact_phone: optionalText(formData, "contact_phone"),
      notes: optionalText(formData, "notes"),
    })
    .eq("id", venueId);

  revalidatePath("/venues");
}

export async function deleteVenue(venueId: string) {
  const supabase = await createClient();
  await supabase.from("venues").delete().eq("id", venueId);
  revalidatePath("/venues");
}
