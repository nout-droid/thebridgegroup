import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { RiderSection, RiderSectionItem } from "@/lib/types";
import { RiderReadOnly } from "@/app/projects/[id]/rider-readonly";
import { Nav } from "./supplier-nav";
import { Footer } from "@/components/footer";
import { getSupplierProjects } from "./data";

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

      sections = (riderSections ?? []).map((section) => ({
        ...section,
        items: (riderSectionItems ?? []).filter((item) => item.section_id === section.id),
      }));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplier.name} active="rider" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <h1 className="text-2xl font-semibold">Rider</h1>

        {!projects.length ? (
          <p className="text-sm text-muted-foreground">
            Er staat nog geen project voor je klaar. Zodra er een offerteverzoek voor je is aangemaakt
            verschijnt het project hier.
          </p>
        ) : (
          <>
            {projects.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/supplier-portal/${supplierId}?project=${project.id}`}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedProject?.id === project.id
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {project.name}
                  </Link>
                ))}
              </div>
            )}

            {sections.length > 0 ? (
              <RiderReadOnly sections={sections} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Er is nog geen rider beschikbaar voor dit project.
              </p>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
