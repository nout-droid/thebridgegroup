import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function countUnreadNotifications(supabase: SupabaseClient<any>, ownerId: string): Promise<number> {
  const { count } = await supabase
    .from("activity_log")
    .select("id, project:projects!inner(user_id)", { count: "exact", head: true })
    .is("acknowledged_at", null)
    .eq("project.user_id", ownerId);

  return count ?? 0;
}
