import "server-only";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, Stage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProjectOrNotFound(supabase: SupabaseClient<any>, id: string): Promise<Project> {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle<Project>();

  if (!project) notFound();
  return project;
}

export async function getStageOrNotFound(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string,
  stageId: string
): Promise<Stage> {
  const { data: stage } = await supabase
    .from("stages")
    .select("*")
    .eq("id", stageId)
    .eq("project_id", projectId)
    .maybeSingle<Stage>();

  if (!stage) notFound();
  return stage;
}
