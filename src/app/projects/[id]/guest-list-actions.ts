"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GuestRsvpStatus, GuestType } from "@/lib/types";

export async function createGuest(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("event_guests").insert({
    project_id: projectId,
    name,
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    guest_type: String(formData.get("guest_type") ?? "gast"),
    plus_ones: Number(formData.get("plus_ones") ?? 0) || 0,
  });

  revalidatePath(`/projects/${projectId}/guests`);
}

export async function updateGuestRsvp(projectId: string, guestId: string, status: GuestRsvpStatus) {
  const supabase = await createClient();
  await supabase.from("event_guests").update({ rsvp_status: status }).eq("id", guestId);
  revalidatePath(`/projects/${projectId}/guests`);
}

export async function updateGuestType(projectId: string, guestId: string, formData: FormData) {
  const guestType = String(formData.get("guest_type") ?? "gast") as GuestType;
  const supabase = await createClient();
  await supabase.from("event_guests").update({ guest_type: guestType }).eq("id", guestId);
  revalidatePath(`/projects/${projectId}/guests`);
}

export async function deleteGuest(projectId: string, guestId: string) {
  const supabase = await createClient();
  await supabase.from("event_guests").delete().eq("id", guestId);
  revalidatePath(`/projects/${projectId}/guests`);
}
