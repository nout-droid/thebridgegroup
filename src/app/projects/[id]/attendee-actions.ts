"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAttendeeAppEnabled(projectId: string, formData: FormData) {
  const enabled = String(formData.get("attendee_app_enabled") ?? "") === "on";

  const supabase = await createClient();
  await supabase.from("projects").update({ attendee_app_enabled: enabled }).eq("id", projectId);

  revalidatePath(`/projects/${projectId}/attendees`);
  revalidatePath(`/projects/${projectId}`);
}
