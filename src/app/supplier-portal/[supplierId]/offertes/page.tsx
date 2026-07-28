import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { QuoteDocument } from "@/lib/types";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { SupplierDashboard, type SupplierProjectGroup } from "../supplier-dashboard";
import { SupplierTranslatorProvider } from "../translator-context";
import { SUPPLIER_NAV_LABELS, OFFERTES_DASHBOARD_LABELS } from "../labels";

interface RawQuoteRow {
  id: string;
  cost_price: number;
  status: string;
  created_at: string;
  category: { name: string; project: { id: string; name: string } | null } | null;
  documents: QuoteDocument[];
}

interface RawPendingDocumentRow extends QuoteDocument {
  project: { id: string; name: string } | null;
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

  // Alle drie hangen alleen af van `supplierId` (auth is hierboven al bevestigd) en niet van
  // elkaar — parallel opvragen i.p.v. na elkaar.
  const [{ data: supplier }, { data: quotes }, { data: pendingDocuments }] = await Promise.all([
    admin.from("suppliers").select("id, name").eq("id", supplierId).maybeSingle(),
    admin
      .from("quotes")
      .select(
        "id, cost_price, status, created_at, category:categories(name, project:projects(id, name)), documents:quote_documents(*)"
      )
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .returns<RawQuoteRow[]>(),
    admin
      .from("quote_documents")
      .select("*, project:projects(id, name)")
      .eq("supplier_id", supplierId)
      .is("quote_id", null)
      .order("created_at", { ascending: false })
      .returns<RawPendingDocumentRow[]>(),
  ]);

  if (!supplier) notFound();

  const allDocuments = [
    ...(quotes ?? []).flatMap((q) => q.documents ?? []),
    ...(pendingDocuments ?? []),
  ];
  const signedUrls = await Promise.all(
    allDocuments.map((doc) => getSignedPortalUrl(doc.storage_path))
  );
  const signedUrlById = new Map(allDocuments.map((doc, i) => [doc.id, signedUrls[i]]));

  const groups = new Map<string, SupplierProjectGroup>();

  function ensureGroup(projectId: string, projectName: string): SupplierProjectGroup {
    let group = groups.get(projectId);
    if (!group) {
      group = { projectId, projectName, quotes: [], pendingDocuments: [] };
      groups.set(projectId, group);
    }
    return group;
  }

  for (const q of quotes ?? []) {
    const project = q.category?.project;
    if (!project) continue;
    const group = ensureGroup(project.id, project.name);
    group.quotes.push({
      id: q.id,
      costPrice: q.cost_price,
      status: q.status,
      categoryName: q.category?.name ?? "—",
      documents: (q.documents ?? [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((doc) => ({ ...doc, signedUrl: signedUrlById.get(doc.id) ?? null })),
    });
  }

  for (const doc of pendingDocuments ?? []) {
    if (!doc.project) continue;
    const group = ensureGroup(doc.project.id, doc.project.name);
    group.pendingDocuments.push({ ...doc, signedUrl: signedUrlById.get(doc.id) ?? null });
  }

  const rows = [...groups.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));

  return (
    <SupplierTranslatorProvider
      staticLabels={[...SUPPLIER_NAV_LABELS, ...OFFERTES_DASHBOARD_LABELS]}
      dynamicTexts={rows.map((p) => p.projectName)}
    >
      <SupplierDashboard supplierId={supplierId} supplierName={supplier.name} projects={rows} />
    </SupplierTranslatorProvider>
  );
}
