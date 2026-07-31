"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadPortalDocument } from "@/lib/server/portal-storage";
import { logActivity } from "@/lib/server/log-activity";

// Zelfde autorisatiepatroon als isAuthorizedSupplier (supplier-portal/[supplierId]/actions.ts):
// eigenaar met sessie mag altijd, anders is de guest_token_<token>-cookie (gezet bij
// inloggen via /guest-portal) het bewijs van toegang tot dit gastenportaal.
async function isAuthorizedGuest(token: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("share_token", token)
      .maybeSingle();
    if (ownedProject) return ownedProject.id;
  }

  const cookieStore = await cookies();
  if (!cookieStore.get(`guest_token_${token}`)) return null;

  // Geen sessie, dus de gewone client kan het project niet lezen (RLS) — de cookie is hier
  // het bewijs van toegang, projectId via de admin-client opzoeken.
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  return project?.id ?? null;
}

export async function uploadGuestOwnDocument(token: string, formData: FormData) {
  const projectId = await isAuthorizedGuest(token);
  if (!projectId) return;

  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!title || !(file instanceof File) || file.size === 0) return;

  const admin = createAdminClient();
  const path = `guests/${projectId}/uploads/${Date.now()}-${file.name}`;
  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await admin.from("guest_documents").insert({
    project_id: projectId,
    title,
    storage_path: path,
    original_filename: file.name,
    uploaded_by: "guest",
  });

  await logActivity(admin, {
    projectId,
    actorType: "guest",
    category: "gast",
    description: `Document geüpload door gast: ${title}`,
  });

  revalidatePath(`/guest/${token}`);
  revalidatePath(`/projects/${projectId}/guests`);
}
