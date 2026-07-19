"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadPortalDocument } from "@/lib/server/portal-storage";
import { logActivity } from "@/lib/server/log-activity";
import { isSupplierLinkedToProject } from "./data";

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
      .maybeSingle();
    if (ownedSupplier) return true;
  }

  const cookieStore = await cookies();
  return Boolean(cookieStore.get(`supplier_token_${supplierId}`));
}

export async function uploadSupplierDocument(
  supplierId: string,
  projectId: string,
  formData: FormData
) {
  if (!(await isAuthorizedSupplier(supplierId))) return;
  if (!(await isSupplierLinkedToProject(supplierId, projectId))) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const admin = createAdminClient();

  const path = `projects/${projectId}/suppliers/${supplierId}/${Date.now()}-${file.name}`;
  const { error } = await uploadPortalDocument(path, file);
  if (error) return;

  await admin.from("quote_documents").insert({
    quote_id: null,
    project_id: projectId,
    supplier_id: supplierId,
    uploaded_by: "supplier",
    storage_path: path,
    original_filename: file.name,
  });

  await logActivity(admin, {
    projectId,
    actorType: "supplier",
    supplierId,
    category: "offerte",
    description: "Offerte-PDF geüpload",
  });

  revalidatePath(`/supplier-portal/${supplierId}`);
}
