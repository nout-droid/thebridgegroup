"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deletePortalDocument, uploadPortalDocument } from "@/lib/server/portal-storage";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/speakers`);
}

function parseFormFields(formData: FormData) {
  const stageIdRaw = String(formData.get("stage_id") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    notes_for_showcaller: String(formData.get("notes_for_showcaller") ?? "").trim(),
    stage_id: stageIdRaw ? stageIdRaw : null,
  };
}

async function handlePresentationUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  speakerId: string,
  formData: FormData,
  previousPath: string | null
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const path = `speakers/${projectId}/${Date.now()}-${file.name}`;
  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await supabase
    .from("speakers")
    .update({ presentation_url: path, presentation_filename: file.name })
    .eq("id", speakerId);

  if (previousPath) {
    await deletePortalDocument(previousPath);
  }
}

export async function addSpeaker(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("speakers")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: inserted } = await supabase
    .from("speakers")
    .insert({ project_id: projectId, ...fields, sort_order: count ?? 0 })
    .select("id")
    .single();

  if (inserted) {
    await handlePresentationUpload(supabase, projectId, inserted.id, formData, null);
  }

  revalidate(projectId);
}

export async function updateSpeaker(projectId: string, speakerId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("speakers").update(fields).eq("id", speakerId);

  const { data: existing } = await supabase
    .from("speakers")
    .select("presentation_url")
    .eq("id", speakerId)
    .maybeSingle();

  await handlePresentationUpload(
    supabase,
    projectId,
    speakerId,
    formData,
    existing?.presentation_url || null
  );

  revalidate(projectId);
}

export async function deleteSpeaker(projectId: string, speakerId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("speakers")
    .select("presentation_url")
    .eq("id", speakerId)
    .maybeSingle();

  await supabase.from("speakers").delete().eq("id", speakerId);

  if (existing?.presentation_url) {
    await deletePortalDocument(existing.presentation_url);
  }

  revalidate(projectId);
}
