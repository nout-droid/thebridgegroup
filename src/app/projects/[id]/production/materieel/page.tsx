import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { EquipmentReservation, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { EquipmentCard } from "../equipment-card";

export default async function ProductionEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: reservations } = await supabase
    .from("equipment_reservations")
    .select("*, supplier:suppliers(*)")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<EquipmentReservation[]>();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  const { data: stages } = await supabase
    .from("stages")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Stage[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="materieel" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <EquipmentCard
          projectId={project.id}
          reservations={reservations ?? []}
          suppliers={suppliers ?? []}
          stages={stages ?? []}
        />
      </main>
      <Footer />
    </div>
  );
}
