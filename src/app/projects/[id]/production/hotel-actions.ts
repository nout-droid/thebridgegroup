"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory, findOrCreateQuote } from "@/lib/server/category-helpers";
import { computeNights } from "@/lib/nights";
import type { MarginType } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Sejourskosten = som van (tarief per nacht x aantal nachten) over iedereen met "Hotel
// nodig" — gebruikt de handmatige-kostenpost ("stelpost") op een aparte "Sejours"-
// categorie, zodat het automatisch in de begroting meetelt zonder een offerte nodig te hebben.
async function syncSejoursCategory(supabase: SupabaseServerClient, projectId: string) {
  const { data: members } = await supabase
    .from("crew_members")
    .select("access_dates, per_diem_rate")
    .eq("project_id", projectId)
    .eq("needs_hotel", true);

  const total = (members ?? []).reduce((sum, member) => {
    const rate = member.per_diem_rate ?? 0;
    if (!rate) return sum;
    return sum + rate * computeNights(member.access_dates ?? []);
  }, 0);

  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Sejours");
  if (categoryId) {
    await supabase.from("categories").update({ manual_cost: total }).eq("id", categoryId);
  }
}

export async function updateCrewPerDiem(projectId: string, memberId: string, formData: FormData) {
  const rate = Math.max(0, Number(formData.get("per_diem_rate") ?? 0));

  const supabase = await createClient();
  await supabase.from("crew_members").update({ per_diem_rate: rate }).eq("id", memberId);

  await syncSejoursCategory(supabase, projectId);

  revalidatePath(`/projects/${projectId}/production/hotel`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/hotel`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveHotelCost(projectId: string, formData: FormData) {
  const supplierId = String(formData.get("supplier_id") ?? "");
  const costPrice = Number(formData.get("cost_price") ?? 0);
  const marginType = String(formData.get("margin_type") ?? "percentage") as MarginType;
  const marginValue = Number(formData.get("margin_value") ?? 0);

  if (!supplierId) return;

  const supabase = await createClient();
  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Hotel");
  if (!categoryId) return;

  await supabase
    .from("categories")
    .update({ margin_type: marginType, margin_value: marginValue })
    .eq("id", categoryId);

  const quoteId = await findOrCreateQuote(supabase, categoryId, supplierId, "Hotelkosten");
  if (quoteId) {
    await supabase.from("quotes").update({ cost_price: costPrice }).eq("id", quoteId);
  }

  revalidate(projectId);
}

export async function setSuppliersManageTravel(projectId: string, formData: FormData) {
  const enabled = formData.get("suppliers_manage_travel") === "on";

  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ suppliers_manage_travel: enabled })
    .eq("id", projectId);

  revalidatePath(`/projects/${projectId}/production/hotel`);
}
