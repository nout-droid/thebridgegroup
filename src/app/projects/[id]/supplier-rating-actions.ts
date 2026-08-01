"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function rateSupplier(projectId: string, supplierId: string, formData: FormData) {
  const rating = Number(formData.get("rating") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  if (rating < 1 || rating > 5) return;

  const supabase = await createClient();
  await supabase
    .from("supplier_ratings")
    .upsert(
      { project_id: projectId, supplier_id: supplierId, rating, note },
      { onConflict: "project_id,supplier_id" }
    );

  revalidatePath(`/projects/${projectId}/evaluation`);
}
