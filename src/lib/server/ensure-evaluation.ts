import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureEvaluation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from("project_evaluations")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from("project_evaluations")
    .insert({ project_id: projectId })
    .select("id")
    .single();

  return created?.id;
}
