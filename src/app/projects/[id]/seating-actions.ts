"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/guests`);
}

export async function addSeatingTable(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("seating_tables")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("seating_tables").insert({
    project_id: projectId,
    name,
    capacity: Math.max(1, Number(formData.get("capacity") ?? 8) || 8),
    notes: String(formData.get("notes") ?? "").trim(),
    stage_id: String(formData.get("stage_id") ?? "") || null,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateSeatingTable(projectId: string, tableId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("seating_tables")
    .update({
      name,
      capacity: Math.max(1, Number(formData.get("capacity") ?? 8) || 8),
      notes: String(formData.get("notes") ?? "").trim(),
      stage_id: String(formData.get("stage_id") ?? "") || null,
    })
    .eq("id", tableId);

  revalidate(projectId);
}

export async function deleteSeatingTable(projectId: string, tableId: string) {
  const supabase = await createClient();
  // Gasten aan deze tafel niet mee verwijderen — terugzetten naar "niet ingedeeld" via
  // on delete set null (zie migratie), dus hier alleen de tafel zelf weg.
  await supabase.from("seating_tables").delete().eq("id", tableId);
  revalidate(projectId);
}

export async function assignGuestToTable(projectId: string, guestId: string, formData: FormData) {
  const tableId = String(formData.get("table_id") ?? "") || null;
  const supabase = await createClient();
  await supabase.from("event_guests").update({ table_id: tableId }).eq("id", guestId);
  revalidate(projectId);
}
