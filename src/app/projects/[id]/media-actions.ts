"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl, removeFromStorage, uploadToStorage } from "@/lib/supabase/storage-rest";

const BUCKET = "project-media";

function extFromFile(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : "bin";
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx >= 0 ? publicUrl.slice(idx + marker.length) : null;
}

export async function uploadProjectBackground(projectId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const path = `projects/${projectId}/background/${Date.now()}.${extFromFile(file)}`;

  const ok = await uploadToStorage(supabase, BUCKET, path, file);
  if (!ok) return;

  await supabase
    .from("projects")
    .update({ background_image_url: publicStorageUrl(BUCKET, path) })
    .eq("id", projectId);

  revalidatePath(`/projects/${projectId}/media`);
}

export async function deleteProjectBackground(projectId: string) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("background_image_url")
    .eq("id", projectId)
    .maybeSingle();

  await supabase.from("projects").update({ background_image_url: null }).eq("id", projectId);

  const path = project?.background_image_url
    ? extractStoragePath(project.background_image_url)
    : null;
  if (path) await removeFromStorage(supabase, BUCKET, [path]);

  revalidatePath(`/projects/${projectId}/media`);
}

export async function uploadProjectPhoto(projectId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const path = `projects/${projectId}/media/${crypto.randomUUID()}.${extFromFile(file)}`;

  const ok = await uploadToStorage(supabase, BUCKET, path, file);
  if (!ok) return;

  const { count } = await supabase
    .from("project_media")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("project_media").insert({
    project_id: projectId,
    kind: "photo",
    url: publicStorageUrl(BUCKET, path),
    sort_order: count ?? 0,
  });

  revalidatePath(`/projects/${projectId}/media`);
}

export async function addProjectVideoLink(projectId: string, formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!url) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("project_media")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("project_media").insert({
    project_id: projectId,
    kind: "video_link",
    url,
    caption,
    sort_order: count ?? 0,
  });

  revalidatePath(`/projects/${projectId}/media`);
}

export async function deleteProjectMedia(projectId: string, mediaId: string) {
  const supabase = await createClient();

  const { data: media } = await supabase
    .from("project_media")
    .select("url, kind")
    .eq("id", mediaId)
    .maybeSingle();

  await supabase.from("project_media").delete().eq("id", mediaId);

  if (media?.kind === "photo") {
    const path = extractStoragePath(media.url);
    if (path) await removeFromStorage(supabase, BUCKET, [path]);
  }

  revalidatePath(`/projects/${projectId}/media`);
}
