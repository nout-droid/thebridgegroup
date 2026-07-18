import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { QuoteDocument } from "@/lib/types";
import { SupplierDashboard, type SupplierQuoteRow } from "../supplier-dashboard";

interface RawQuoteRow {
  id: string;
  cost_price: number;
  status: string;
  created_at: string;
  category: { name: string; project: { name: string } | null } | null;
  documents: QuoteDocument[];
}

export default async function SupplierPortalDashboard({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: ownedSupplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();
    isOwner = Boolean(ownedSupplier);
  }

  if (!isOwner) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`supplier_token_${supplierId}`)) {
      redirect("/supplier-portal");
    }
  }

  const admin = createAdminClient();
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) notFound();

  const { data: quotes } = await admin
    .from("quotes")
    .select(
      "id, cost_price, status, created_at, category:categories(name, project:projects(name)), documents:quote_documents(*)"
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .returns<RawQuoteRow[]>();

  const rows: SupplierQuoteRow[] = (quotes ?? []).map((q) => ({
    id: q.id,
    costPrice: q.cost_price,
    status: q.status,
    categoryName: q.category?.name ?? "—",
    projectName: q.category?.project?.name ?? "—",
    documents: (q.documents ?? []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  return <SupplierDashboard supplierId={supplierId} supplierName={supplier.name} quotes={rows} />;
}
