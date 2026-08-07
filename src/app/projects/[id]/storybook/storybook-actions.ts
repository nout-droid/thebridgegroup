"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl, removeFromStorage, uploadToStorage } from "@/lib/supabase/storage-rest";
import { generateStorybookConcept, type StorybookConcept } from "@/lib/server/storybook-concept";

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

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/storybook`);
}

export async function addStorybookChapter(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("storybook_chapters")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("storybook_chapters").insert({
    project_id: projectId,
    title,
    description: String(formData.get("description") ?? "").trim(),
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateStorybookChapter(projectId: string, chapterId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  await supabase
    .from("storybook_chapters")
    .update({
      title,
      description: String(formData.get("description") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", chapterId);

  revalidate(projectId);
}

export async function deleteStorybookChapter(projectId: string, chapterId: string) {
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("storybook_images")
    .select("url")
    .eq("chapter_id", chapterId);

  const paths = (images ?? []).map((img) => extractStoragePath(img.url)).filter((p): p is string => !!p);
  if (paths.length) await removeFromStorage(supabase, BUCKET, paths);

  await supabase.from("storybook_chapters").delete().eq("id", chapterId);
  revalidate(projectId);
}

// Wisselt sort_order met de buur erboven/onder — eenvoudige swap i.p.v. een aparte
// reorder-tabel, consistent genoeg zolang hoofdstukken uniek gesorteerd blijven.
export async function moveStorybookChapter(projectId: string, chapterId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data: chapters } = await supabase
    .from("storybook_chapters")
    .select("id, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const rows = chapters ?? [];
  const index = rows.findIndex((c) => c.id === chapterId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swap = rows[swapIndex];

  await Promise.all([
    supabase.from("storybook_chapters").update({ sort_order: swap.sort_order }).eq("id", current.id),
    supabase.from("storybook_chapters").update({ sort_order: current.sort_order }).eq("id", swap.id),
  ]);

  revalidate(projectId);
}

export async function uploadStorybookImage(projectId: string, chapterId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const path = `projects/${projectId}/storybook/${chapterId}/${crypto.randomUUID()}.${extFromFile(file)}`;

  const ok = await uploadToStorage(supabase, BUCKET, path, file);
  if (!ok) return;

  const { count } = await supabase
    .from("storybook_images")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  await supabase.from("storybook_images").insert({
    chapter_id: chapterId,
    url: publicStorageUrl(BUCKET, path),
    caption: String(formData.get("caption") ?? "").trim(),
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function generateStorybookConceptSuggestion(
  brief: string
): Promise<{ concept?: StorybookConcept; error?: string }> {
  const concept = await generateStorybookConcept(brief);
  if (!concept) {
    return {
      error:
        "AI-suggestie genereren is niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt) of is mislukt — probeer het later opnieuw.",
    };
  }
  return { concept };
}

export async function deleteStorybookImage(projectId: string, imageId: string) {
  const supabase = await createClient();

  const { data: image } = await supabase
    .from("storybook_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  await supabase.from("storybook_images").delete().eq("id", imageId);

  const path = image ? extractStoragePath(image.url) : null;
  if (path) await removeFromStorage(supabase, BUCKET, [path]);

  revalidate(projectId);
}
