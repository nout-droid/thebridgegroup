import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { EquipmentReservation } from "@/lib/types";
import { Nav } from "../../supplier-nav";
import { Footer } from "@/components/footer";
import { getAuthorizedSupplier, getSupplierProjects } from "../../data";
import { AanvragenSubNav } from "../aanvragen-sub-nav";
import { SupplierTranslatorProvider } from "../../translator-context";
import { SupplierEquipmentSection } from "../equipment-section";
import { SUPPLIER_NAV_LABELS } from "../../labels";
import { AANVRAGEN_SUB_NAV_LABELS, EQUIPMENT_SECTION_LABELS } from "../labels";

export default async function SupplierEquipmentRequestsPage({
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

  let reservations: EquipmentReservation[] = [];
  if (selectedProject) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("equipment_reservations")
      .select("*")
      .eq("project_id", selectedProject.id)
      .eq("supplier_id", supplierId)
      .order("sort_order", { ascending: true })
      .returns<EquipmentReservation[]>();
    reservations = data ?? [];
  }

  return (
    <SupplierTranslatorProvider
      staticLabels={[...SUPPLIER_NAV_LABELS, ...AANVRAGEN_SUB_NAV_LABELS, ...EQUIPMENT_SECTION_LABELS]}
      dynamicTexts={projects.map((p) => p.name)}
    >
      <div className="flex min-h-screen flex-col">
        <Nav supplierId={supplierId} supplierName={supplier.name} active="aanvragen" />
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
          <AanvragenSubNav
            supplierId={supplierId}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            selectedProjectId={selectedProject?.id ?? null}
            active="equipment"
            showTravel={selectedProject?.suppliers_manage_travel ?? false}
          />
          {selectedProject && (
            <SupplierEquipmentSection supplierId={supplierId} projectId={selectedProject.id} reservations={reservations} />
          )}
        </main>
        <Footer />
      </div>
    </SupplierTranslatorProvider>
  );
}
