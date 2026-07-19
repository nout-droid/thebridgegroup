"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory } from "@/lib/server/category-helpers";

export async function goToHotelBudgetCategory(projectId: string) {
  const supabase = await createClient();
  await findOrCreateCategory(supabase, projectId, null, "Hotel");
  redirect(`/projects/${projectId}/budget`);
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
