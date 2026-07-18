import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { CrewMember, EquipmentReservation, CommsAssignment, CateringOrder } from "@/lib/types";
import { Nav } from "../supplier-nav";
import { Footer } from "@/components/footer";
import { getSupplierProjects } from "../data";
import { SupplierCrewSection } from "./crew-section";
import { SupplierEquipmentSection } from "./equipment-section";
import { SupplierCommsSection } from "./comms-section";
import { SupplierCateringSection } from "./catering-section";

export default async function SupplierRequestsPage({
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

  const projects = await getSupplierProjects(supplierId);
  const selectedProject = projects.find((p) => p.id === projectParam) ?? projects[0] ?? null;

  let crewMembers: CrewMember[] = [];
  let equipment: EquipmentReservation[] = [];
  let comms: CommsAssignment[] = [];
  let catering: CateringOrder[] = [];

  if (selectedProject) {
    const [crewRes, equipmentRes, commsRes, cateringRes] = await Promise.all([
      admin
        .from("crew_members")
        .select("*")
        .eq("project_id", selectedProject.id)
        .eq("supplier_id", supplierId)
        .order("sort_order", { ascending: true })
        .returns<CrewMember[]>(),
      admin
        .from("equipment_reservations")
        .select("*")
        .eq("project_id", selectedProject.id)
        .eq("supplier_id", supplierId)
        .order("sort_order", { ascending: true })
        .returns<EquipmentReservation[]>(),
      admin
        .from("comms_assignments")
        .select("*")
        .eq("project_id", selectedProject.id)
        .eq("supplier_id", supplierId)
        .order("sort_order", { ascending: true })
        .returns<CommsAssignment[]>(),
      admin
        .from("catering_orders")
        .select("*")
        .eq("project_id", selectedProject.id)
        .eq("supplier_id", supplierId)
        .order("sort_order", { ascending: true })
        .returns<CateringOrder[]>(),
    ]);
    crewMembers = crewRes.data ?? [];
    equipment = equipmentRes.data ?? [];
    comms = commsRes.data ?? [];
    catering = cateringRes.data ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplier.name} active="aanvragen" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <h1 className="text-2xl font-semibold">Aanvragen</h1>

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
                    href={`/supplier-portal/${supplierId}/aanvragen?project=${project.id}`}
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

            {selectedProject && (
              <div className="space-y-6">
                <SupplierCrewSection
                  supplierId={supplierId}
                  projectId={selectedProject.id}
                  members={crewMembers}
                />
                <SupplierEquipmentSection
                  supplierId={supplierId}
                  projectId={selectedProject.id}
                  reservations={equipment}
                />
                <SupplierCommsSection
                  supplierId={supplierId}
                  projectId={selectedProject.id}
                  assignments={comms}
                />
                <SupplierCateringSection
                  supplierId={supplierId}
                  projectId={selectedProject.id}
                  orders={catering}
                />
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
