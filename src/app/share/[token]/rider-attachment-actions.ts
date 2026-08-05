"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";
import { logActivity } from "@/lib/server/log-activity";

// Zelfde patroon als intake-photo-actions.ts: de klant heeft geen Supabase-sessie, alleen
// het share_token, dus deze acties nemen het token expliciet mee en gebruiken de
// service-role admin-client. Upload is alleen toegestaan voor onderdelen die de eigenaar
// heeft gemarkeerd als "klant mag invullen" (editable_by_client) — consistent met hoe de
// rider al per onderdeel bepaalt wat de klant mag wijzigen.

export async function uploadRiderSectionAttachmentByClient(
  shareToken: string,
  sectionId: string,
  formData: FormData
): Promise<{ attachment?: { id: string; original_filename: string; uploaded_by: "owner" | "client" }; error?: string }> {
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

  const { data: section } = await admin
    .from("rider_sections")
    .select("id, editable_by_client, rider_id")
    .eq("id", sectionId)
    .maybeSingle();
  if (!section || !section.editable_by_client) return { error: "Niet toegestaan." };

  const { data: rider } = await admin
    .from("riders")
    .select("project_id")
    .eq("id", section.rider_id)
    .maybeSingle();
  if (!rider || rider.project_id !== project.id) return { error: "Niet toegestaan." };

  const path = `rider/${project.id}/${sectionId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await uploadPortalDocument(path, file);
  if (uploadError) return { error: "Upload mislukt." };

  const { data: attachment } = await admin
    .from("rider_section_attachments")
    .insert({
      section_id: sectionId,
      storage_path: path,
      original_filename: file.name,
      uploaded_by: "client",
    })
    .select("id, original_filename, uploaded_by")
    .single();

  if (!attachment) return { error: "Upload mislukt." };

  await logActivity(admin, {
    projectId: project.id,
    actorType: "client",
    category: "rider",
    description: `Bijlage toegevoegd bij rider: ${file.name}`,
  });

  return { attachment };
}

export async function deleteRiderSectionAttachmentByClient(shareToken: string, attachmentId: string) {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!project) return;

  const { data: attachment } = await admin
    .from("rider_section_attachments")
    .select("storage_path, section_id")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!attachment) return;

  const { data: section } = await admin
    .from("rider_sections")
    .select("rider_id")
    .eq("id", attachment.section_id)
    .maybeSingle();
  if (!section) return;

  const { data: rider } = await admin
    .from("riders")
    .select("project_id")
    .eq("id", section.rider_id)
    .maybeSingle();
  if (!rider || rider.project_id !== project.id) return;

  await admin.from("rider_section_attachments").delete().eq("id", attachmentId);
  await deletePortalDocument(attachment.storage_path);
}
