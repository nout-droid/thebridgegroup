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
