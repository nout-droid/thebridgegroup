"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function rateCrewMember(projectId: string, crewMemberId: string, formData: FormData) {
  const rating = Number(formData.get("rating") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  if (rating < 1 || rating > 5) return;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("crew_members")
    .select("role, freelancer_id")
    .eq("id", crewMemberId)
    .maybeSingle();
  if (!member) return;

  await supabase
    .from("crew_ratings")
    .upsert(
      {
        project_id: projectId,
        crew_member_id: crewMemberId,
        freelancer_id: member.freelancer_id,
        role: member.role,
        rating,
        note,
      },
      { onConflict: "project_id,crew_member_id" }
    );

  revalidatePath(`/projects/${projectId}/evaluation`);
}
