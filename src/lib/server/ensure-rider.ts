import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RIDER_SECTIONS } from "@/lib/rider-defaults";

// Zorgt dat elk project een rider heeft met de standaard onderdelen, zodat die niet
// telkens met de hand aangemaakt hoeven te worden. Onderdelen die niet van toepassing
// zijn kan Nout per project gewoon verwijderen.
export async function ensureRiderWithDefaults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from("riders")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from("riders")
    .insert({ project_id: projectId })
    .select("id")
    .single();

  if (!created?.id) return undefined;

  await supabase.from("rider_sections").insert(
    DEFAULT_RIDER_SECTIONS.map((section, index) => ({
      rider_id: created.id,
      title: section.title,
      content: section.content ?? "",
      editable_by_client: section.editable_by_client,
      sort_order: index,
    }))
  );

  return created.id;
}
