"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/server/log-activity";

// De klant heeft geen Supabase-sessie, alleen het share_token — zelfde patroon als
// uploadIntakeChecklistPhotoByClient: token expliciet als argument, service-role admin-client.
const BUCKET = "project-media";

export async function submitProjectSignature(
  shareToken: string,
  formData: FormData
): Promise<{ url?: string; signedBy?: string; signedAt?: string; error?: string }> {
  const file = formData.get("signature");
  const signedBy = String(formData.get("signed_by") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Geen handtekening ontvangen." };
  if (!signedBy) return { error: "Vul je naam in." };

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!project) return { error: "Project niet gevonden." };

  const path = `projects/${project.id}/signature-${Date.now()}.png`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: "image/png" });
  if (uploadError) return { error: "Uploaden van handtekening mislukt." };

  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const signedAt = new Date().toISOString();

  await admin
    .from("projects")
    .update({
      signature_url: publicUrlData.publicUrl,
      signature_signed_by: signedBy,
      signature_signed_at: signedAt,
    })
    .eq("id", project.id);

  await logActivity(admin, {
    projectId: project.id,
    actorType: "client",
    category: "begroting",
    description: `Digitaal ondertekend door ${signedBy}`,
  });

  return { url: publicUrlData.publicUrl, signedBy, signedAt };
}
