"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkInEventGuest(token: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("event_guests")
    .select("checked_in_at")
    .eq("badge_token", token)
    .maybeSingle();

  if (existing && !existing.checked_in_at) {
    await admin
      .from("event_guests")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("badge_token", token);
  }

  revalidatePath(`/guest-badge/${token}`);
}

export async function checkOutEventGuest(token: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("event_guests")
    .select("checked_in_at, checked_out_at")
    .eq("badge_token", token)
    .maybeSingle();

  if (existing?.checked_in_at && !existing.checked_out_at) {
    await admin
      .from("event_guests")
      .update({ checked_out_at: new Date().toISOString() })
      .eq("badge_token", token);
  }

  revalidatePath(`/guest-badge/${token}`);
}
