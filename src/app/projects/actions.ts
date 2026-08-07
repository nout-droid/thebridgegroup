"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";
import { getOrgAccess } from "@/lib/server/subscription";
import { logAudit } from "@/lib/server/audit";
import { EVENT_TYPES } from "@/lib/types";

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
  const eventTypeRaw = String(formData.get("event_type") ?? "festival");
  const eventType = (EVENT_TYPES as readonly string[]).includes(eventTypeRaw) ? eventTypeRaw : "festival";
  const preProductionWeeksRaw = formData.get("pre_production_weeks");
  const preProductionWeeks =
    preProductionWeeksRaw === null || preProductionWeeksRaw === ""
      ? null
      : Math.max(0, Number(preProductionWeeksRaw) || 0);

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  // Centrale abonnement-check: blokkeert nieuwe projecten bij verlopen proefperiode,
  // opgezegd abonnement of mislukte betaling — niet alleen op projectaantal.
  const access = await getOrgAccess(ownerId);
  if (!access.canCreateProject) {
    redirect(`/projects?error=${encodeURIComponent(access.message ?? "Upgrade je abonnement op /team om verder te gaan.")}`);
  }

  // Loopt via een security-definer RPC i.p.v. een rechtstreekse insert — zie
  // migrations_create_project_secure_rpc.sql voor de reden (bevestigde RLS-evaluatie-anomalie
  // op deze tabel, niet op te lossen via de policy zelf).
  const { data: newId, error } = await supabase.rpc("create_project_secure", {
    p_owner_id: ownerId,
    p_name: name,
    p_client_name: clientName,
    p_event_date: eventDate || null,
    p_event_code: generateEventCode(),
    p_event_type: eventType,
    p_pre_production_weeks: preProductionWeeks,
  });

  if (error || !newId) {
    redirect(`/projects?error=${encodeURIComponent(error?.message ?? "Onbekende fout")}`);
  }

  revalidatePath("/projects");
  redirect(`/projects/${newId}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  await supabase.from("projects").delete().eq("id", projectId);

  if (user) {
    const ownerId = await getTeamOwnerId(supabase, user.id);
    const admin = createAdminClient();
    await logAudit(admin, {
      ownerId,
      actorLabel: user.email ?? "Onbekend",
      action: "Project verwijderd",
      details: project?.name ?? "",
    });
  }

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
      "user_id, name, client_name, event_date, build_start_date, strike_end_date, show_start_date, show_end_date, show_type, suppliers_manage_travel, background_image_url, client_budget, default_margin_percentage, event_type, pre_production_weeks"
    )
    .eq("id", projectId)
    .single();
  if (!original) {
    redirect(`/projects?error=${encodeURIComponent(fetchError?.message ?? "Project niet gevonden.")}`);
  }

  // Structuur (podia + categorieën/marges + rider-inhoud) wordt gedupliceerd — een nieuw
  // startpunt voor een vergelijkbaar (vaak terugkerend) event. Offertes, crew, draaiboek en
  // klant-/crew-toegang worden bewust NIET meegekopieerd (project-specifiek, en
  // toegangswachtwoorden horen niet over te gaan naar een kopie). Rider-inhoud (technische
  // specs, teksten) is juist wél herbruikbaar voor eenzelfde terugkerend event.
  // Loopt via dezelfde security-definer RPC als createProject — zie
  // migrations_create_project_secure_rpc.sql.
  const { data: newId, error } = await supabase.rpc("create_project_secure", {
    p_owner_id: ownerId,
    p_name: `${original.name} (kopie)`,
    p_client_name: original.client_name,
    p_event_date: original.event_date,
    p_event_code: generateEventCode(),
    p_build_start_date: original.build_start_date,
    p_strike_end_date: original.strike_end_date,
    p_show_start_date: original.show_start_date,
    p_show_end_date: original.show_end_date,
    p_show_type: original.show_type,
    p_suppliers_manage_travel: original.suppliers_manage_travel,
    p_background_image_url: original.background_image_url,
    p_client_budget: original.client_budget,
    p_default_margin_percentage: original.default_margin_percentage,
    p_event_type: original.event_type,
    p_pre_production_weeks: original.pre_production_weeks,
  });
  const created = newId ? { id: newId } : null;
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

  const { data: originalRider } = await supabase
    .from("riders")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (originalRider) {
    const { data: sections } = await supabase
      .from("rider_sections")
      .select("id, title, content, editable_by_client, sort_order, include_in_callsheet, stage_id")
      .eq("rider_id", originalRider.id)
      .order("sort_order", { ascending: true });

    if (sections?.length) {
      const { data: newRider } = await supabase
        .from("riders")
        .insert({ project_id: created!.id })
        .select("id")
        .single();

      if (newRider) {
        const sectionIdMap = new Map<string, string>();
        for (const section of sections) {
          const { data: newSection } = await supabase
            .from("rider_sections")
            .insert({
              rider_id: newRider.id,
              title: section.title,
              content: section.content,
              editable_by_client: section.editable_by_client,
              sort_order: section.sort_order,
              include_in_callsheet: section.include_in_callsheet,
              stage_id: section.stage_id ? stageIdMap.get(section.stage_id) ?? null : null,
            })
            .select("id")
            .single();
          if (newSection) sectionIdMap.set(section.id, newSection.id);
        }

        const { data: items } = await supabase
          .from("rider_section_items")
          .select("section_id, description, sort_order")
          .in("section_id", sections.map((s) => s.id));

        if (items?.length) {
          await supabase.from("rider_section_items").insert(
            items
              .filter((item) => sectionIdMap.has(item.section_id))
              .map((item) => ({
                section_id: sectionIdMap.get(item.section_id)!,
                description: item.description,
                sort_order: item.sort_order,
              }))
          );
        }
      }
    }
  }

  revalidatePath("/projects");
  redirect(`/projects/${created.id}`);
}
