import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { RiderSection, RiderSectionItem } from "@/lib/types";
import { Nav } from "./supplier-nav";
import { Footer } from "@/components/footer";
import { getSupplierProjects } from "./data";
import { SupplierRiderView } from "./supplier-rider-view";
import { SupplierTranslatorProvider } from "./translator-context";
import { SUPPLIER_NAV_LABELS, RIDER_VIEW_LABELS } from "./labels";
import { RIDER_READONLY_LABELS } from "../../projects/[id]/rider-readonly";

export default async function SupplierRiderPage({
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

  // Beide queries hangen alleen af van `supplierId` (auth is hierboven al bevestigd) en
  // niet van elkaar — parallel opvragen i.p.v. na elkaar.
  const [{ data: supplier }, projects] = await Promise.all([
    admin.from("suppliers").select("id, name").eq("id", supplierId).maybeSingle(),
    getSupplierProjects(supplierId),
  ]);

  if (!supplier) notFound();

  const selectedProject = projects.find((p) => p.id === projectParam) ?? projects[0] ?? null;

  let projectWideSections: RiderSection[] = [];
  let stageGroups: { stageId: string; stageName: string; sections: RiderSection[] }[] = [];

  if (selectedProject) {
    const { data: rider } = await admin
      .from("riders")
      .select("id")
      .eq("project_id", selectedProject.id)
      .maybeSingle();

    if (rider) {
      // riderSections hangt af van `rider.id`; quoteCategoryRows hangt alleen af van
      // `supplierId`/`selectedProject.id` (al bekend) — onderling onafhankelijk, dus parallel.
      const [{ data: riderSections }, { data: quoteCategoryRows }] = await Promise.all([
        admin
          .from("rider_sections")
          .select("*")
          .eq("rider_id", rider.id)
          .order("sort_order", { ascending: true })
          .returns<RiderSection[]>(),
        // Alleen de podia/areas waar deze leverancier daadwerkelijk voor is aangevraagd (via een
        // offerte-categorie met stage_id) — zelfde "werkt aan" afleiding als getSupplierProjects,
        // zodat een leverancier nooit rider-content van een ander podium te zien krijgt.
        admin
          .from("quotes")
          .select("category:categories!inner(stage_id, project_id)")
          .eq("supplier_id", supplierId)
          .eq("category.project_id", selectedProject.id)
          .returns<{ category: { stage_id: string | null; project_id: string } | null }[]>(),
      ]);

      const { data: riderSectionItems } = riderSections?.length
        ? await admin
            .from("rider_section_items")
            .select("*")
            .in(
              "section_id",
              riderSections.map((s) => s.id)
            )
            .order("sort_order", { ascending: true })
            .returns<RiderSectionItem[]>()
        : { data: [] as RiderSectionItem[] };

      const sectionsWithItems = (riderSections ?? []).map((section) => ({
        ...section,
        items: (riderSectionItems ?? []).filter((item) => item.section_id === section.id),
      }));

      const relevantStageIds = new Set(
        (quoteCategoryRows ?? [])
          .map((row) => row.category?.stage_id)
          .filter((id): id is string => Boolean(id))
      );

      projectWideSections = sectionsWithItems.filter((s) => !s.stage_id);

      const relevantStageSections = sectionsWithItems.filter(
        (s) => s.stage_id && relevantStageIds.has(s.stage_id)
      );
      const stageIds = [...new Set(relevantStageSections.map((s) => s.stage_id as string))];
      const { data: stages } = stageIds.length
        ? await admin.from("stages").select("id, name").in("id", stageIds)
        : { data: [] };
      const stageNameById = new Map((stages ?? []).map((s) => [s.id, s.name]));

      stageGroups = stageIds
        .map((stageId) => ({
          stageId,
          stageName: stageNameById.get(stageId) ?? "",
          sections: relevantStageSections.filter((s) => s.stage_id === stageId),
        }))
        .filter((group) => group.sections.length > 0)
        .sort((a, b) => a.stageName.localeCompare(b.stageName));
    }
  }

  const allSections = [...projectWideSections, ...stageGroups.flatMap((g) => g.sections)];
  const dynamicTexts = [
    ...projects.map((p) => p.name),
    ...stageGroups.map((g) => g.stageName),
    ...allSections.flatMap((s) => [s.title, s.content, ...(s.items ?? []).map((i) => i.description)]),
  ];

  return (
    <SupplierTranslatorProvider
      staticLabels={[...SUPPLIER_NAV_LABELS, ...RIDER_VIEW_LABELS, ...RIDER_READONLY_LABELS]}
      dynamicTexts={dynamicTexts}
    >
      <div className="flex min-h-screen flex-col">
        <Nav supplierId={supplierId} supplierName={supplier.name} active="rider" />
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
          <SupplierRiderView
            supplierId={supplierId}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            selectedProjectId={selectedProject?.id ?? null}
            projectWideSections={projectWideSections}
            stageGroups={stageGroups}
          />
        </main>
        <Footer />
      </div>
    </SupplierTranslatorProvider>
  );
}
