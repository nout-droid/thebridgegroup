"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { uploadPortalDocument } from "@/lib/server/portal-storage";

// Zelfde patroon als guest-document-uploads: crew heeft geen eigen sessie/RLS-toegang, dus
// dit draait via de service-role client na verificatie van het share_token (net als
// add_crew_note, maar file-upload kan niet via een SQL RPC — vandaar een server action).
export async function submitIncidentReport(token: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const division = String(formData.get("division") ?? "").trim();
  const reportedBy = String(formData.get("reported_by") ?? "").trim();
  const stageId = String(formData.get("stage_id") ?? "").trim() || null;
  const file = formData.get("photo");

  if (!description) return;

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .not("crew_password_hash", "is", null)
    .maybeSingle();
  if (!project) return;

  let photoPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    photoPath = `projects/${project.id}/incidents/${crypto.randomUUID()}-${file.name}`;
    const { error } = await uploadPortalDocument(photoPath, file);
    if (error) photoPath = null;
  }

  await admin.from("incident_reports").insert({
    project_id: project.id,
    stage_id: stageId,
    division,
    description,
    photo_path: photoPath,
    reported_by: reportedBy,
  });
}
