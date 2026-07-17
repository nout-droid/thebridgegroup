import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "portal-documents";

export async function uploadPortalDocument(path: string, file: File) {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  return { error };
}

export async function getSignedPortalUrl(path: string, expiresInSeconds = 3600) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deletePortalDocument(path: string) {
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}
