"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CommsKind } from "@/lib/types";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/comms`);
}

export async function addCommsAssignment(projectId: string, kind: CommsKind, formData: FormData) {
  const userName = String(formData.get("user_name") ?? "").trim();
  if (!userName) return;

  const deviceType = String(formData.get("device_type") ?? "").trim();
  const channels = String(formData.get("channels") ?? "").trim();

  const supabase = await createClient();
  const { count } = await supabase
    .from("comms_assignments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("kind", kind);

  await supabase.from("comms_assignments").insert({
    project_id: projectId,
    kind,
    user_name: userName,
    device_type: deviceType,
    channels,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateCommsAssignment(
  projectId: string,
  assignmentId: string,
  formData: FormData
) {
  const userName = String(formData.get("user_name") ?? "").trim();
  if (!userName) return;

  const deviceType = String(formData.get("device_type") ?? "").trim();
  const channels = String(formData.get("channels") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("comms_assignments")
    .update({ user_name: userName, device_type: deviceType, channels })
    .eq("id", assignmentId);

  revalidate(projectId);
}

export async function deleteCommsAssignment(projectId: string, assignmentId: string) {
  const supabase = await createClient();
  await supabase.from("comms_assignments").delete().eq("id", assignmentId);
  revalidate(projectId);
}
