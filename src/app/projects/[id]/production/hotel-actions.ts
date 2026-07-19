"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory, findOrCreateQuote } from "@/lib/server/category-helpers";
import type { MarginType } from "@/lib/types";

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
