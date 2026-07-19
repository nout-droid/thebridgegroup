import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CrewMember, CrewPosition, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { CrewPlanningCard } from "../crew-planning-card";

export default async function ProductionPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: positions } = await supabase
    .from("crew_positions")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<CrewPosition[]>();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  const { data: stages } = await supabase
    .from("stages")
    .select("*")
    .eq("project_id", id)
    .order("name", { ascending: true })
    .returns<Stage[]>();

  const { data: linkedMembers } = await supabase
    .from("crew_members")
    .select("*")
    .eq("project_id", id)
    .not("crew_position_id", "is", null)
    .returns<CrewMember[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="planning" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CrewPlanningCard
          projectId={project.id}
          positions={positions ?? []}
          suppliers={suppliers ?? []}
          stages={stages ?? []}
          linkedMembers={linkedMembers ?? []}
        />
      </main>
      <Footer />
    </div>
  );
}
