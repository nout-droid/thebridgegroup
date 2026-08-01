import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { QuoteLineItem } from "@/lib/types";
import { getAuthorizedSupplier, getSupplierProjects } from "../data";
import { SupplierBegrotingView, type BegrotingQuoteRow } from "./begroting-view";
import { SupplierTranslatorProvider } from "../translator-context";
import { SUPPLIER_NAV_LABELS, BEGROTING_VIEW_LABELS } from "../labels";

interface RawQuoteRow {
  id: string;
  cost_price: number;
  status: string;
  load_in_time: string | null;
  load_out_time: string | null;
  category: { name: string; project_id: string } | null;
  line_items: QuoteLineItem[];
}

export default async function SupplierBegrotingPage({
  params,
  searchParams,
}: {
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const { supplierId } = await params;
  const { project: projectParam } = await searchParams;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const { supplier } = await getAuthorizedSupplier(supplierId);
  const projects = await getSupplierProjects(supplierId);
  const selectedProject = projects.find((p) => p.id === projectParam) ?? projects[0] ?? null;

  let quotes: BegrotingQuoteRow[] = [];
  if (selectedProject) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("quotes")
      .select(
        "id, cost_price, status, load_in_time, load_out_time, category:categories(name, project_id), line_items:quote_line_items(*)"
      )
      .eq("supplier_id", supplierId)
      .returns<RawQuoteRow[]>();

    quotes = (data ?? [])
      .filter((q) => q.category?.project_id === selectedProject.id)
      .map((q) => ({
        id: q.id,
        categoryName: q.category?.name ?? "—",
        status: q.status,
        costPrice: q.cost_price,
        loadInTime: q.load_in_time,
        loadOutTime: q.load_out_time,
        lineItems: (q.line_items ?? []).sort((a, b) => a.description.localeCompare(b.description)),
      }));
  }

  const dynamicTexts = [...projects.map((p) => p.name), ...quotes.map((q) => q.categoryName)];

  return (
    <SupplierTranslatorProvider
      staticLabels={[...SUPPLIER_NAV_LABELS, ...BEGROTING_VIEW_LABELS]}
      dynamicTexts={dynamicTexts}
    >
      <SupplierBegrotingView
        supplierId={supplierId}
        supplierName={supplier.name}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedProjectId={selectedProject?.id ?? null}
        quotes={quotes}
      />
    </SupplierTranslatorProvider>
  );
}
