"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadPortalDocument } from "@/lib/server/portal-storage";

export async function isAuthorizedSupplier(supplierId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: ownedSupplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (ownedSupplier) return true;
  }

  const cookieStore = await cookies();
  return Boolean(cookieStore.get(`supplier_token_${supplierId}`));
}

export async function uploadSupplierDocument(
  supplierId: string,
  quoteId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const admin = createAdminClient();

  const { data: quote } = await admin
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (!quote) return;

  const path = `quotes/${quoteId}/${Date.now()}-${file.name}`;
  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await admin.from("quote_documents").insert({
    quote_id: quoteId,
    uploaded_by: "supplier",
    storage_path: path,
    original_filename: file.name,
  });

  revalidatePath(`/supplier-portal/${supplierId}`);
}
