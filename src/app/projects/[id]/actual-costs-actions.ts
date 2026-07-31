"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { removeFromStorage, uploadToStorage } from "@/lib/supabase/storage-rest";

const BUCKET = "portal-documents";

export async function addActualCost(projectId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw === "" ? NaN : Number(amountRaw);
  if (!description || Number.isNaN(amount)) return;

  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const supplierId = String(formData.get("supplier_id") ?? "").trim() || null;
  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim() || null;
  const invoiceDate = String(formData.get("invoice_date") ?? "").trim() || null;

  const supabase = await createClient();

  let documentUrl: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const path = `projects/${projectId}/actual-costs/${crypto.randomUUID()}-${file.name}`;
    const ok = await uploadToStorage(supabase, BUCKET, path, file);
    if (ok) documentUrl = path;
  }

  await supabase.from("actual_costs").insert({
    project_id: projectId,
    category_id: categoryId,
    supplier_id: supplierId,
    description,
    amount,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    document_url: documentUrl,
  });

  revalidatePath(`/projects/${projectId}/budget`);
}

export async function deleteActualCost(projectId: string, actualCostId: string) {
  const supabase = await createClient();

  const { data: actualCost } = await supabase
    .from("actual_costs")
    .select("document_url")
    .eq("id", actualCostId)
    .maybeSingle();

  await supabase.from("actual_costs").delete().eq("id", actualCostId);

  if (actualCost?.document_url) {
    await removeFromStorage(supabase, BUCKET, [actualCost.document_url]);
  }

  revalidatePath(`/projects/${projectId}/budget`);
}
