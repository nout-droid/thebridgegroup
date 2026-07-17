"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/vragen`);
}

export async function addOpenQuestion(projectId: string, formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return;

  const answer = String(formData.get("answer") ?? "").trim();

  const supabase = await createClient();
  const { count } = await supabase
    .from("open_questions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("open_questions").insert({
    project_id: projectId,
    question,
    answer,
    pending: true,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateOpenQuestion(projectId: string, questionId: string, formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return;

  const answer = String(formData.get("answer") ?? "").trim();
  const pending = formData.get("pending") === "on";

  const supabase = await createClient();
  await supabase
    .from("open_questions")
    .update({ question, answer, pending })
    .eq("id", questionId);

  revalidate(projectId);
}

export async function deleteOpenQuestion(projectId: string, questionId: string) {
  const supabase = await createClient();
  await supabase.from("open_questions").delete().eq("id", questionId);
  revalidate(projectId);
}

export async function addMeetingNote(projectId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("meeting_notes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("meeting_notes").insert({
    project_id: projectId,
    note,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateMeetingNote(projectId: string, noteId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;

  const supabase = await createClient();
  await supabase.from("meeting_notes").update({ note }).eq("id", noteId);

  revalidate(projectId);
}

export async function deleteMeetingNote(projectId: string, noteId: string) {
  const supabase = await createClient();
  await supabase.from("meeting_notes").delete().eq("id", noteId);
  revalidate(projectId);
}
