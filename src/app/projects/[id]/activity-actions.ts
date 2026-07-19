"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acknowledgeActivity(projectId: string, activityId: string) {
  const supabase = await createClient();
  await supabase
    .from("activity_log")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", activityId);

  revalidatePath(`/projects/${projectId}`);
}
