import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RIDER_SECTIONS } from "@/lib/rider-defaults";

// Zorgt dat elk project een rider heeft met de standaard projectbrede onderdelen, zodat die
// niet telkens met de hand aangemaakt hoeven te worden. Onderdelen die niet van toepassing
// zijn kan Nout per project gewoon verwijderen. Stage-specifieke onderdelen (Stage informatie,
// Audio, Light, ...) worden hier bewust niet meegezaaid — zie ensureStageRiderSections.
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

  const projectWideSections = DEFAULT_RIDER_SECTIONS.filter((s) => !s.stageSpecific);
  await supabase.from("rider_sections").insert(
    projectWideSections.map((section, index) => ({
      rider_id: created.id,
      stage_id: null,
      title: section.title,
      content: section.content ?? "",
      editable_by_client: section.editable_by_client,
      sort_order: index,
    }))
  );

  return created.id;
}

// Zaait de stage-specifieke onderdelen (Stage informatie, Audio, Light, Video, Rigging,
// Special FX, Decor, Stage plot) voor één podium/area, de eerste keer dat de rider-pagina van
// die stage bezocht wordt — elke stage krijgt zo zijn eigen, onafhankelijk invulbare kopie.
export async function ensureStageRiderSections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  riderId: string,
  stageId: string
): Promise<void> {
  const { count } = await supabase
    .from("rider_sections")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId)
    .eq("stage_id", stageId);

  if (count) return;

  const { count: projectWideCount } = await supabase
    .from("rider_sections")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId)
    .is("stage_id", null);

  const stageSpecificSections = DEFAULT_RIDER_SECTIONS.filter((s) => s.stageSpecific);
  await supabase.from("rider_sections").insert(
    stageSpecificSections.map((section, index) => ({
      rider_id: riderId,
      stage_id: stageId,
      title: section.title,
      content: section.content ?? "",
      editable_by_client: section.editable_by_client,
      sort_order: (projectWideCount ?? 0) + index,
    }))
  );
}
