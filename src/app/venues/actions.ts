"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";

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

export async function uploadVenueDocument(venueId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!title || !(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const path = `venues/${venueId}/${Date.now()}-${file.name}`;

  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await supabase.from("venue_documents").insert({
    venue_id: venueId,
    title,
    storage_path: path,
    original_filename: file.name,
  });

  revalidatePath("/venues");
}

export async function deleteVenueDocument(documentId: string) {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("venue_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  await supabase.from("venue_documents").delete().eq("id", documentId);

  if (document?.storage_path) {
    await deletePortalDocument(document.storage_path);
  }

  revalidatePath("/venues");
}
