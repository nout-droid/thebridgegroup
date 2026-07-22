"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ProvidedBy = "wij" | "klant" | "leverancier";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/planning`);
  revalidatePath(`/projects/${projectId}/production`);
}

interface PositionFields {
  work_date: string;
  role: string;
  quantity: number;
  provided_by: ProvidedBy;
  supplier_id: string | null;
  stage_id: string | null;
  needs_accreditation: boolean;
  needs_catering: boolean;
  needs_hotel: boolean;
  needs_flight: boolean;
  notes: string;
}

function parseFormFields(formData: FormData): PositionFields {
  const providedByRaw = String(formData.get("provided_by") ?? "wij");
  const providedBy: ProvidedBy = (["wij", "klant", "leverancier"] as const).includes(
    providedByRaw as ProvidedBy
  )
    ? (providedByRaw as ProvidedBy)
    : "wij";

  return {
    work_date: String(formData.get("work_date") ?? ""),
    role: String(formData.get("role") ?? "").trim(),
    quantity: Math.max(1, Number(formData.get("quantity") ?? 1)),
    provided_by: providedBy,
    supplier_id: providedBy === "leverancier" ? String(formData.get("supplier_id") ?? "") || null : null,
    stage_id: String(formData.get("stage_id") ?? "") || null,
    needs_accreditation: formData.get("needs_accreditation") === "on",
    needs_catering: formData.get("needs_catering") === "on",
    needs_hotel: formData.get("needs_hotel") === "on",
    needs_flight: formData.get("needs_flight") === "on",
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

async function syncAccreditationForPosition(
  supabase: SupabaseServerClient,
  position: { id: string; project_id: string } & PositionFields
) {
  const { data: existing } = await supabase
    .from("crew_members")
    .select("id, name")
    .eq("crew_position_id", position.id);

  const rows = existing ?? [];

  if (!position.needs_accreditation) {
    const unnamed = rows.filter((row) => !row.name).map((row) => row.id);
    if (unnamed.length) {
      await supabase.from("crew_members").delete().in("id", unnamed);
    }
    return;
  }

  if (rows.length < position.quantity) {
    const toCreate = position.quantity - rows.length;
    const { count } = await supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", position.project_id);
    const startSortOrder = count ?? 0;

    await supabase.from("crew_members").insert(
      Array.from({ length: toCreate }, (_, i) => ({
        project_id: position.project_id,
        crew_position_id: position.id,
        name: "",
        role: position.role,
        supplier_id: position.supplier_id,
        access_dates: [position.work_date],
        needs_catering: position.needs_catering,
        needs_hotel: position.needs_hotel,
        needs_flight: position.needs_flight,
        accredited: false,
        sort_order: startSortOrder + i,
      }))
    );
  } else if (rows.length > position.quantity) {
    const surplus = rows.length - position.quantity;
    const unnamed = rows
      .filter((row) => !row.name)
      .map((row) => row.id)
      .slice(0, surplus);
    if (unnamed.length) {
      await supabase.from("crew_members").delete().in("id", unnamed);
    }
  }
}

export async function addCrewPosition(projectId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.work_date || !fields.role) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("crew_positions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: created } = await supabase
    .from("crew_positions")
    .insert({ project_id: projectId, ...fields, sort_order: count ?? 0 })
    .select("id")
    .single();

  if (created) {
    await syncAccreditationForPosition(supabase, { id: created.id, project_id: projectId, ...fields });
  }

  revalidate(projectId);
}

export async function updateCrewPosition(projectId: string, positionId: string, formData: FormData) {
  const fields = parseFormFields(formData);
  if (!fields.work_date || !fields.role) return;

  const supabase = await createClient();
  await supabase.from("crew_positions").update(fields).eq("id", positionId);

  await syncAccreditationForPosition(supabase, { id: positionId, project_id: projectId, ...fields });

  revalidate(projectId);
}

export async function deleteCrewPosition(projectId: string, positionId: string) {
  const supabase = await createClient();

  const { data: unnamed } = await supabase
    .from("crew_members")
    .select("id")
    .eq("crew_position_id", positionId)
    .eq("name", "");
  if (unnamed?.length) {
    await supabase.from("crew_members").delete().in("id", unnamed.map((row) => row.id));
  }

  await supabase.from("crew_positions").delete().eq("id", positionId);
  revalidate(projectId);
}
