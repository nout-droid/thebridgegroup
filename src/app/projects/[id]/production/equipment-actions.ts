"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/materieel`);
}

export async function addEquipmentReservation(projectId: string, formData: FormData) {
  const machineType = String(formData.get("machine_type") ?? "").trim();
  if (!machineType) return;

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const accessories = String(formData.get("accessories") ?? "").trim();
  const reservationDate = String(formData.get("reservation_date") ?? "") || null;
  const duration = String(formData.get("duration") ?? "").trim();
  const machineNumber = String(formData.get("machine_number") ?? "").trim();
  const pickedUp = formData.get("picked_up") === "on";
  const keyHolder = String(formData.get("key_holder") ?? "").trim();

  const supabase = await createClient();
  const { count } = await supabase
    .from("equipment_reservations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("equipment_reservations").insert({
    project_id: projectId,
    machine_type: machineType,
    supplier_id: supplierId,
    quantity,
    accessories,
    reservation_date: reservationDate,
    duration,
    machine_number: machineNumber,
    picked_up: pickedUp,
    key_holder: keyHolder,
    sort_order: count ?? 0,
  });

  revalidate(projectId);
}

export async function updateEquipmentReservation(
  projectId: string,
  reservationId: string,
  formData: FormData
) {
  const machineType = String(formData.get("machine_type") ?? "").trim();
  if (!machineType) return;

  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const accessories = String(formData.get("accessories") ?? "").trim();
  const reservationDate = String(formData.get("reservation_date") ?? "") || null;
  const duration = String(formData.get("duration") ?? "").trim();
  const machineNumber = String(formData.get("machine_number") ?? "").trim();
  const pickedUp = formData.get("picked_up") === "on";
  const keyHolder = String(formData.get("key_holder") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("equipment_reservations")
    .update({
      machine_type: machineType,
      supplier_id: supplierId,
      quantity,
      accessories,
      reservation_date: reservationDate,
      duration,
      machine_number: machineNumber,
      picked_up: pickedUp,
      key_holder: keyHolder,
    })
    .eq("id", reservationId);

  revalidate(projectId);
}

export async function deleteEquipmentReservation(projectId: string, reservationId: string) {
  const supabase = await createClient();
  await supabase.from("equipment_reservations").delete().eq("id", reservationId);
  revalidate(projectId);
}
