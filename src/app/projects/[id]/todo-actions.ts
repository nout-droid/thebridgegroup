"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import type { ProjectTodo } from "@/lib/types";

export async function toggleProjectTodo(projectId: string, todoId: string) {
  const supabase = await createClient();

  const { data: todo } = await supabase
    .from("project_todos")
    .select("done")
    .eq("id", todoId)
    .maybeSingle<Pick<ProjectTodo, "done">>();
  if (!todo) return;

  const nextDone = !todo.done;
  await supabase
    .from("project_todos")
    .update({ done: nextDone, done_at: nextDone ? new Date().toISOString() : null })
    .eq("id", todoId);

  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectTodo(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("project_todos")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = (rows?.[0]?.sort_order ?? -1) + 1;

  await supabase.from("project_todos").insert({ project_id: projectId, title, sort_order: nextSortOrder });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectTodo(projectId: string, todoId: string) {
  const supabase = await createClient();
  await supabase.from("project_todos").delete().eq("id", todoId);
  revalidatePath(`/projects/${projectId}`);
}

// Slaat de huidige taken van dit project op als nieuwe organisatiebrede standaardsjabloon
// — overschrijft de bestaande template-rijen volledig, zodat toekomstige projecten met
// deze (bijgewerkte) lijst starten.
export async function saveProjectTodosAsDefaultTemplate(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const { data: todos } = await supabase
    .from("project_todos")
    .select("title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .returns<{ title: string; sort_order: number }[]>();

  if (!todos || !todos.length) return;

  await supabase.from("todo_templates").delete().eq("owner_user_id", ownerId);
  await supabase
    .from("todo_templates")
    .insert(todos.map((todo) => ({ owner_user_id: ownerId, title: todo.title, sort_order: todo.sort_order })));

  revalidatePath(`/projects/${projectId}`);
}
