import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type LogActivityParams = {
  projectId: string;
  category: string;
  description: string;
} & ({ actorType: "client" } | { actorType: "supplier"; supplierId: string });

// Logt een wijziging door een klant of leverancier, zodat de eigenaar dit terugziet
// op het projectdashboard en in de dagelijkse samenvattingsmail. Alleen echte
// project-aanpassingen — geen live show-bediening (crew-notes, rundown-chat,
// showcaller-cues), die zou de log alleen maar vervuilen.
export async function logActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  params: LogActivityParams
) {
  let actorLabel = "Klant";
  if (params.actorType === "supplier") {
    const { data: supplier } = await admin
      .from("suppliers")
      .select("name")
      .eq("id", params.supplierId)
      .maybeSingle();
    actorLabel = supplier?.name ?? "Leverancier";
  }

  await admin.from("activity_log").insert({
    project_id: params.projectId,
    actor_type: params.actorType,
    actor_label: actorLabel,
    category: params.category,
    description: params.description,
  });
}
