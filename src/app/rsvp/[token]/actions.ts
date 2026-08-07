"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_RSVP_STATUSES, type GuestRsvpStatus } from "@/lib/types";

export async function submitRsvp(token: string, formData: FormData) {
  const statusRaw = String(formData.get("status") ?? "");
  const status = (GUEST_RSVP_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as GuestRsvpStatus)
    : null;
  if (!status || status === "uitgenodigd") return;

  const admin = createAdminClient();
  await admin
    .from("event_guests")
    .update({
      rsvp_status: status,
      plus_one_name: String(formData.get("plus_one_name") ?? "").trim(),
      dietary_notes: String(formData.get("dietary_notes") ?? "").trim(),
      responded_at: new Date().toISOString(),
    })
    .eq("invite_token", token);

  revalidatePath(`/rsvp/${token}`);
}
