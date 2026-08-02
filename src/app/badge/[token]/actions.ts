"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkInCrewMember(token: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("crew_members")
    .select("checked_in_at")
    .eq("badge_token", token)
    .maybeSingle();

  if (existing && !existing.checked_in_at) {
    await admin
      .from("crew_members")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("badge_token", token);
  }

  revalidatePath(`/badge/${token}`);
}

export async function checkOutCrewMember(token: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("crew_members")
    .select("checked_in_at, checked_out_at")
    .eq("badge_token", token)
    .maybeSingle();

  if (existing?.checked_in_at && !existing.checked_out_at) {
    await admin
      .from("crew_members")
      .update({ checked_out_at: new Date().toISOString() })
      .eq("badge_token", token);
  }

  revalidatePath(`/badge/${token}`);
}
