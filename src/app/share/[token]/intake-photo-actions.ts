"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";
import { logActivity } from "@/lib/server/log-activity";
import type { IntakeChecklistPhoto } from "@/lib/types";

// De klant heeft geen Supabase-sessie, alleen het share_token — dus deze acties
// nemen het token expliciet als argument (i.p.v. een cookie te lezen, zoals de
// leverancier/gast-flows doen) en werken met de service-role admin-client, exact
// zoals uploadSupplierDocument (src/app/supplier-portal/[supplierId]/actions.ts).

export async function uploadIntakeChecklistPhotoByClient(
  shareToken: string,
  sectionKey: string,
  formData: FormData
): Promise<{ photo?: IntakeChecklistPhoto; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Geen bestand geselecteerd." };
  }

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!project) return { error: "Project niet gevonden." };

  let checklistId: string | undefined;
  const { data: existing } = await admin
    .from("intake_checklists")
    .select("id")
    .eq("project_id", project.id)
    .maybeSingle();
  checklistId = existing?.id;

  if (!checklistId) {
    const { data: created } = await admin
      .from("intake_checklists")
      .insert({ project_id: project.id })
      .select("id")
      .single();
    checklistId = created?.id;
  }
  if (!checklistId) return { error: "Kon checklist niet aanmaken." };

  const path = `intake/${project.id}/${sectionKey}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await uploadPortalDocument(path, file);
  if (uploadError) return { error: "Upload mislukt." };

  const { data: photo } = await admin
    .from("intake_checklist_photos")
    .insert({
      checklist_id: checklistId,
      section_key: sectionKey,
      storage_path: path,
      original_filename: file.name,
      uploaded_by: "client",
    })
    .select("id, section_key, original_filename, uploaded_by, created_at")
    .single();

  await admin
    .from("intake_checklists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", checklistId);

  if (!photo) return { error: "Upload mislukt." };

  await logActivity(admin, {
    projectId: project.id,
    actorType: "client",
    category: "checklist",
    description: `Bijlage toegevoegd bij checklist: ${file.name}`,
  });

  return { photo: photo as IntakeChecklistPhoto };
}

export async function deleteIntakeChecklistPhotoByClient(shareToken: string, photoId: string) {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!project) return;

  const { data: photo } = await admin
    .from("intake_checklist_photos")
    .select("storage_path, checklist_id")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return;

  const { data: checklist } = await admin
    .from("intake_checklists")
    .select("project_id")
    .eq("id", photo.checklist_id)
    .maybeSingle();
  if (!checklist || checklist.project_id !== project.id) return;

  await admin.from("intake_checklist_photos").delete().eq("id", photoId);
  await deletePortalDocument(photo.storage_path);
}
