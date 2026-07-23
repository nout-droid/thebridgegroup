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
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) notFound();

  const projects = await getSupplierProjects(supplierId);
  const selectedProject = projects.find((p) => p.id === projectParam) ?? projects[0] ?? null;

  let sections: RiderSection[] = [];

  if (selectedProject) {
    const { data: rider } = await admin
      .from("riders")
      .select("id")
      .eq("project_id", selectedProject.id)
      .maybeSingle();

    if (rider) {
      const { data: riderSections } = await admin
        .from("rider_sections")
        .select("*")
        .eq("rider_id", rider.id)
        .order("sort_order", { ascending: true })
        .returns<RiderSection[]>();

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

      const stageIds = [...new Set((riderSections ?? []).map((s) => s.stage_id).filter((id): id is string => !!id))];
      const { data: stages } = stageIds.length
        ? await admin.from("stages").select("id, name").in("id", stageIds)
        : { data: [] };
      const stageNameById = new Map((stages ?? []).map((s) => [s.id, s.name]));

      sections = (riderSections ?? []).map((section) => ({
        ...section,
        title: section.stage_id && stageNameById.has(section.stage_id)
          ? `[${stageNameById.get(section.stage_id)}] ${section.title}`
          : section.title,
        items: (riderSectionItems ?? []).filter((item) => item.section_id === section.id),
      }));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplier.name} active="rider" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <SupplierRiderView
          supplierId={supplierId}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          selectedProjectId={selectedProject?.id ?? null}
          sections={sections}
        />
      </main>
      <Footer />
    </div>
  );
}
