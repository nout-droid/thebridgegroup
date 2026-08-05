import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProjectVenueAddress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
): Promise<string | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("venue_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.venue_id) return null;

  const { data: venue } = await supabase
    .from("venues")
    .select("address")
    .eq("id", project.venue_id)
    .maybeSingle();
  return venue?.address ?? null;
}
