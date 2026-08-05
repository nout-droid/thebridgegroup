"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncCrewRatesCategory } from "@/lib/server/crew-rates";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production`);
  revalidatePath(`/projects/${projectId}/budget`);
}

// Puur accreditatie-velden — geen tarieven/woonadres/km hier. Wie iemand is en wat die kost
// wordt in Planning geregeld (crew-planning-actions.ts::linkPersonToPosition, dat de
// dag/overuren/km-tarieven + verkoopprijs overneemt van de crewdatabase). Dit formulier zou
// anders bij elke opslag de daar gezette tarieven stilzwijgend op 0 zetten.
interface MemberFields {
  name: string;
  supplier_id: string | null;
  role: string;
  access_level: string;
  id_number: string;
  accredited: boolean;
  needs_catering: boolean;
  needs_hotel: boolean;
  needs_flight: boolean;
  access_dates: string[];
  skills: string[];
}

function parseMemberFields(formData: FormData): MemberFields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    role: String(formData.get("role") ?? "").trim(),
    access_level: String(formData.get("access_level") ?? "").trim(),
    id_number: String(formData.get("id_number") ?? "").trim(),
    accredited: formData.get("accredited") === "on",
    needs_catering: formData.get("needs_catering") === "on",
    needs_hotel: formData.get("needs_hotel") === "on",
    needs_flight: formData.get("needs_flight") === "on",
    access_dates: formData.getAll("access_dates").map(String),
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export async function addCrewMember(projectId: string, formData: FormData) {
  const fields = parseMemberFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("crew_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  await supabase.from("crew_members").insert({
    project_id: projectId,
    ...fields,
    sort_order: count ?? 0,
  });

  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
}

export async function updateCrewMember(projectId: string, memberId: string, formData: FormData) {
  const fields = parseMemberFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("crew_members").update(fields).eq("id", memberId);

  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
}

export async function deleteCrewMember(projectId: string, memberId: string) {
  const supabase = await createClient();
  await supabase.from("crew_members").delete().eq("id", memberId);
  await syncCrewRatesCategory(supabase, projectId);
  revalidate(projectId);
}
