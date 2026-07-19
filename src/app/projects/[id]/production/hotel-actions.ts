"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory } from "@/lib/server/category-helpers";

export async function goToHotelBudgetCategory(projectId: string) {
  const supabase = await createClient();
  await findOrCreateCategory(supabase, projectId, null, "Hotel");
  redirect(`/projects/${projectId}/budget`);
}
