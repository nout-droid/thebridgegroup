"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedSupplier } from "./actions";
import { isSupplierLinkedToProject } from "./data";

function revalidate(supplierId: string, projectId: string, subpage: string) {
  revalidatePath(`/supplier-portal/${supplierId}/aanvragen`);
  revalidatePath(`/projects/${projectId}/production/${subpage}`);
}

async function ownsRow(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  rowId: string,
  supplierId: string
) {
  const { data } = await admin.from(table).select("id").eq("id", rowId).eq("supplier_id", supplierId).maybeSingle();
  return Boolean(data);
}

// ========== Accreditatie (crew_members) ==========

export async function addSupplierCrewMember(
  supplierId: string,
  projectId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;
  if (!(await isSupplierLinkedToProject(supplierId, projectId))) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const role = String(formData.get("role") ?? "").trim();
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const accessDates = formData.getAll("access_dates").map(String);

  const admin = createAdminClient();
  const { count } = await admin
    .from("crew_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await admin.from("crew_members").insert({
    project_id: projectId,
    supplier_id: supplierId,
    name,
    role,
    id_number: idNumber,
    accredited: true,
    access_dates: accessDates,
    sort_order: count ?? 0,
  });

  revalidate(supplierId, projectId, "");
}

export async function updateSupplierCrewMember(
  supplierId: string,
  projectId: string,
  memberId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "crew_members", memberId, supplierId))) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const role = String(formData.get("role") ?? "").trim();
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const accessDates = formData.getAll("access_dates").map(String);

  await admin
    .from("crew_members")
    .update({ name, role, id_number: idNumber, access_dates: accessDates })
    .eq("id", memberId);

  revalidate(supplierId, projectId, "");
}

export async function deleteSupplierCrewMember(supplierId: string, projectId: string, memberId: string) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "crew_members", memberId, supplierId))) return;

  await admin.from("crew_members").delete().eq("id", memberId);
  revalidate(supplierId, projectId, "");
}

// ========== Materieel (equipment_reservations) ==========

export async function addSupplierEquipment(supplierId: string, projectId: string, formData: FormData) {
  if (!(await isAuthorizedSupplier(supplierId))) return;
  if (!(await isSupplierLinkedToProject(supplierId, projectId))) return;

  const machineType = String(formData.get("machine_type") ?? "").trim();
  if (!machineType) return;

  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const accessories = String(formData.get("accessories") ?? "").trim();
  const reservationDate = String(formData.get("reservation_date") ?? "") || null;
  const duration = String(formData.get("duration") ?? "").trim();
  const machineNumber = String(formData.get("machine_number") ?? "").trim();

  const admin = createAdminClient();
  const { count } = await admin
    .from("equipment_reservations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await admin.from("equipment_reservations").insert({
    project_id: projectId,
    supplier_id: supplierId,
    machine_type: machineType,
    quantity,
    accessories,
    reservation_date: reservationDate,
    duration,
    machine_number: machineNumber,
    sort_order: count ?? 0,
  });

  revalidate(supplierId, projectId, "materieel");
}

export async function updateSupplierEquipment(
  supplierId: string,
  projectId: string,
  reservationId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "equipment_reservations", reservationId, supplierId))) return;

  const machineType = String(formData.get("machine_type") ?? "").trim();
  if (!machineType) return;

  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const accessories = String(formData.get("accessories") ?? "").trim();
  const reservationDate = String(formData.get("reservation_date") ?? "") || null;
  const duration = String(formData.get("duration") ?? "").trim();
  const machineNumber = String(formData.get("machine_number") ?? "").trim();

  await admin
    .from("equipment_reservations")
    .update({
      machine_type: machineType,
      quantity,
      accessories,
      reservation_date: reservationDate,
      duration,
      machine_number: machineNumber,
    })
    .eq("id", reservationId);

  revalidate(supplierId, projectId, "materieel");
}

export async function deleteSupplierEquipment(
  supplierId: string,
  projectId: string,
  reservationId: string
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "equipment_reservations", reservationId, supplierId))) return;

  await admin.from("equipment_reservations").delete().eq("id", reservationId);
  revalidate(supplierId, projectId, "materieel");
}

// ========== Comms (comms_assignments) ==========

export async function addSupplierComms(
  supplierId: string,
  projectId: string,
  kind: "intercom" | "portofoon",
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;
  if (!(await isSupplierLinkedToProject(supplierId, projectId))) return;

  const userName = String(formData.get("user_name") ?? "").trim();
  if (!userName) return;

  const deviceType = String(formData.get("device_type") ?? "").trim();
  const channels = String(formData.get("channels") ?? "").trim();

  const admin = createAdminClient();
  const { count } = await admin
    .from("comms_assignments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("kind", kind);

  await admin.from("comms_assignments").insert({
    project_id: projectId,
    supplier_id: supplierId,
    kind,
    user_name: userName,
    device_type: deviceType,
    channels,
    sort_order: count ?? 0,
  });

  revalidate(supplierId, projectId, "comms");
}

export async function updateSupplierComms(
  supplierId: string,
  projectId: string,
  assignmentId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "comms_assignments", assignmentId, supplierId))) return;

  const userName = String(formData.get("user_name") ?? "").trim();
  if (!userName) return;

  const deviceType = String(formData.get("device_type") ?? "").trim();
  const channels = String(formData.get("channels") ?? "").trim();

  await admin
    .from("comms_assignments")
    .update({ user_name: userName, device_type: deviceType, channels })
    .eq("id", assignmentId);

  revalidate(supplierId, projectId, "comms");
}

export async function deleteSupplierComms(supplierId: string, projectId: string, assignmentId: string) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "comms_assignments", assignmentId, supplierId))) return;

  await admin.from("comms_assignments").delete().eq("id", assignmentId);
  revalidate(supplierId, projectId, "comms");
}

// ========== Catering (catering_orders) ==========

export async function addSupplierCatering(supplierId: string, projectId: string, formData: FormData) {
  if (!(await isAuthorizedSupplier(supplierId))) return;
  if (!(await isSupplierLinkedToProject(supplierId, projectId))) return;

  const orderDate = String(formData.get("order_date") ?? "");
  const party = String(formData.get("party") ?? "").trim();
  if (!orderDate || !party) return;

  const admin = createAdminClient();
  const { count } = await admin
    .from("catering_orders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await admin.from("catering_orders").insert({
    project_id: projectId,
    supplier_id: supplierId,
    order_date: orderDate,
    party,
    crew_lunch: Math.max(0, Number(formData.get("crew_lunch") ?? 0)),
    veggie_lunch: Math.max(0, Number(formData.get("veggie_lunch") ?? 0)),
    crew_dinner: Math.max(0, Number(formData.get("crew_dinner") ?? 0)),
    veggie_dinner: Math.max(0, Number(formData.get("veggie_dinner") ?? 0)),
    night_snacks: Math.max(0, Number(formData.get("night_snacks") ?? 0)),
    notes: String(formData.get("notes") ?? "").trim(),
    sort_order: count ?? 0,
  });

  revalidate(supplierId, projectId, "catering");
}

export async function updateSupplierCatering(
  supplierId: string,
  projectId: string,
  orderId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "catering_orders", orderId, supplierId))) return;

  const orderDate = String(formData.get("order_date") ?? "");
  const party = String(formData.get("party") ?? "").trim();
  if (!orderDate || !party) return;

  await admin
    .from("catering_orders")
    .update({
      order_date: orderDate,
      party,
      crew_lunch: Math.max(0, Number(formData.get("crew_lunch") ?? 0)),
      veggie_lunch: Math.max(0, Number(formData.get("veggie_lunch") ?? 0)),
      crew_dinner: Math.max(0, Number(formData.get("crew_dinner") ?? 0)),
      veggie_dinner: Math.max(0, Number(formData.get("veggie_dinner") ?? 0)),
      night_snacks: Math.max(0, Number(formData.get("night_snacks") ?? 0)),
      notes: String(formData.get("notes") ?? "").trim(),
    })
    .eq("id", orderId);

  revalidate(supplierId, projectId, "catering");
}

export async function deleteSupplierCatering(supplierId: string, projectId: string, orderId: string) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "catering_orders", orderId, supplierId))) return;

  await admin.from("catering_orders").delete().eq("id", orderId);
  revalidate(supplierId, projectId, "catering");
}

// ========== Stroom (power_requests) ==========

export async function addSupplierPower(supplierId: string, projectId: string, formData: FormData) {
  if (!(await isAuthorizedSupplier(supplierId))) return;
  if (!(await isSupplierLinkedToProject(supplierId, projectId))) return;

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const stageId = String(formData.get("stage_id") ?? "") || null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const position = String(formData.get("position") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const admin = createAdminClient();
  const { count } = await admin
    .from("power_requests")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await admin.from("power_requests").insert({
    project_id: projectId,
    supplier_id: supplierId,
    stage_id: stageId,
    description,
    quantity,
    position,
    notes,
    sort_order: count ?? 0,
  });

  revalidate(supplierId, projectId, "power");
}

export async function updateSupplierPower(
  supplierId: string,
  projectId: string,
  requestId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "power_requests", requestId, supplierId))) return;

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const stageId = String(formData.get("stage_id") ?? "") || null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const position = String(formData.get("position") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  await admin
    .from("power_requests")
    .update({ stage_id: stageId, description, quantity, position, notes })
    .eq("id", requestId);

  revalidate(supplierId, projectId, "power");
}

export async function deleteSupplierPower(supplierId: string, projectId: string, requestId: string) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const admin = createAdminClient();
  if (!(await ownsRow(admin, "power_requests", requestId, supplierId))) return;

  await admin.from("power_requests").delete().eq("id", requestId);
  revalidate(supplierId, projectId, "power");
}
