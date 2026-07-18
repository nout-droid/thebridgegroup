import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Zorgt dat elk project een intake_checklists-rij heeft. De 9 secties zelf staan
// statisch in src/lib/intake-checklist-sections.ts, dus hier hoeft niets geseed te
// worden — alleen de rij die de antwoorden aan het project koppelt.
export async function ensureIntakeChecklist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from("intake_checklists")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from("intake_checklists")
    .insert({ project_id: projectId })
    .select("id")
    .single();

  return created?.id;
}
