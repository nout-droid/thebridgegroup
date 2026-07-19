import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Zorgt dat er per project(+stage)+show-dag een rundown-header bestaat, zodat de
// live-tracking state (huidige cue, starttijd) altijd een vaste plek heeft.
export async function getOrCreateRundown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string,
  stageId: string | null,
  showDate: string
): Promise<string | undefined> {
  let query = supabase
    .from("rundowns")
    .select("id")
    .eq("project_id", projectId)
    .eq("show_date", showDate);
  query = stageId ? query.eq("stage_id", stageId) : query.is("stage_id", null);
  const { data: existing } = await query.maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from("rundowns")
    .insert({ project_id: projectId, stage_id: stageId, show_date: showDate })
    .select("id")
    .single();

  return created?.id;
}
