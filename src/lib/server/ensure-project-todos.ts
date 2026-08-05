import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectTodo, TodoTemplateItem } from "@/lib/types";

// Standaard organisatiebrede takenlijst — eenmalig geseed zodra iemand 'm nodig heeft,
// daarna volledig aan te passen (zelfde patroon als ensureDefaultTeamRoles). Deze lijst
// wordt bij het eerste bezoek van een project gekopieerd naar project_todos.
const DEFAULT_TODOS = [
  "Intake checklist met klant doornemen",
  "Locatiebezoek plannen",
  "Materiaallijst opstellen",
  "Offertes aanvragen bij leveranciers",
  "Crew inplannen",
  "Rider versturen naar artiesten/sprekers",
  "Draaiboek opstellen",
  "Vergunningen aanvragen",
  "Facturatie afronden",
  "Evaluatie inplannen",
];

export async function ensureTodoTemplate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string
): Promise<TodoTemplateItem[]> {
  const { data: existing } = await supabase
    .from("todo_templates")
    .select("*")
    .eq("owner_user_id", ownerId)
    .order("sort_order", { ascending: true })
    .returns<TodoTemplateItem[]>();

  if (existing && existing.length > 0) return existing;

  const { data: inserted } = await supabase
    .from("todo_templates")
    .insert(DEFAULT_TODOS.map((title, index) => ({ owner_user_id: ownerId, title, sort_order: index })))
    .select("*")
    .returns<TodoTemplateItem[]>();

  return inserted ?? [];
}

export async function ensureProjectTodos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string,
  ownerId: string
): Promise<ProjectTodo[]> {
  const { data: existing } = await supabase
    .from("project_todos")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .returns<ProjectTodo[]>();

  if (existing && existing.length > 0) return existing;

  const template = await ensureTodoTemplate(supabase, ownerId);
  if (!template.length) return [];

  const { data: inserted } = await supabase
    .from("project_todos")
    .insert(template.map((item) => ({ project_id: projectId, title: item.title, sort_order: item.sort_order })))
    .select("*")
    .returns<ProjectTodo[]>();

  return inserted ?? [];
}
