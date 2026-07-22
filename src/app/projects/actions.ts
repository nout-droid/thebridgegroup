"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";

// Geen I/L/O/0/1 — voorkomt verwarring als een klant het Event ID moet overtypen.
const EVENT_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateEventCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += EVENT_CODE_CHARS[Math.floor(Math.random() * EVENT_CODE_CHARS.length)];
  }
  return code;
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  let data: { id: string } | null = null;
  let error: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .from("projects")
      .insert({
        user_id: ownerId,
        name,
        client_name: clientName,
        event_date: eventDate || null,
        event_code: generateEventCode(),
      })
      .select("id")
      .single();

    data = result.data;
    error = result.error;

    if (!error || error.code !== "23505") break;
  }

  if (error || !data) {
    redirect(`/projects?error=${encodeURIComponent(error?.message ?? "Onbekende fout")}`);
  }

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/projects");
}

export async function duplicateProject(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ownerId = await getTeamOwnerId(supabase, user.id);

  const { data: original, error: fetchError } = await supabase
    .from("projects")
    .select(
      "user_id, name, client_name, event_date, build_start_date, strike_end_date, show_start_date, show_end_date, show_type, suppliers_manage_travel, background_image_url, client_budget, default_margin_percentage"
    )
    .eq("id", projectId)
    .single();
  if (!original) {
    redirect(`/projects?error=${encodeURIComponent(fetchError?.message ?? "Project niet gevonden.")}`);
  }

  // Structuur (podia + categorieën/marges) wordt gedupliceerd — een nieuw startpunt voor een
  // vergelijkbaar project. Offertes, crew, draaiboek, rider-inhoud en klant-/crew-toegang
  // worden bewust NIET meegekopieerd (project-specifiek, en toegangswachtwoorden horen niet
  // over te gaan naar een kopie).
  let created: { id: string } | null = null;
  let error: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .from("projects")
      .insert({
        user_id: ownerId,
        name: `${original.name} (kopie)`,
        client_name: original.client_name,
        event_date: original.event_date,
        build_start_date: original.build_start_date,
        strike_end_date: original.strike_end_date,
        show_start_date: original.show_start_date,
        show_end_date: original.show_end_date,
        show_type: original.show_type,
        suppliers_manage_travel: original.suppliers_manage_travel,
        background_image_url: original.background_image_url,
        client_budget: original.client_budget,
        default_margin_percentage: original.default_margin_percentage,
        event_code: generateEventCode(),
      })
      .select("id")
      .single();

    created = result.data;
    error = result.error;
    if (!error || error.code !== "23505") break;
  }
  if (!created) {
    redirect(`/projects?error=${encodeURIComponent(error?.message ?? "Dupliceren mislukt.")}`);
  }

  const { data: stages } = await supabase
    .from("stages")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const stageIdMap = new Map<string, string>();
  for (const stage of stages ?? []) {
    const { data: newStage } = await supabase
      .from("stages")
      .insert({ project_id: created.id, name: stage.name, sort_order: stage.sort_order })
      .select("id")
      .single();
    if (newStage) stageIdMap.set(stage.id, newStage.id);
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("name, sort_order, stage_id, margin_type, margin_value")
    .eq("project_id", projectId);

  if (categories?.length) {
    await supabase.from("categories").insert(
      categories.map((category) => ({
        project_id: created!.id,
        name: category.name,
        sort_order: category.sort_order,
        stage_id: category.stage_id ? stageIdMap.get(category.stage_id) ?? null : null,
        margin_type: category.margin_type,
        margin_value: category.margin_value,
      }))
    );
  }

  revalidatePath("/projects");
  redirect(`/projects/${created.id}`);
}
