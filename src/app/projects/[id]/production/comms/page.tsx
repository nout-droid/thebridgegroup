import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import type { CommsAssignment } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { CommsCard } from "../comms-card";

export default async function ProductionCommsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: assignments } = await supabase
    .from("comms_assignments")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<CommsAssignment[]>();

  const intercomAssignments = (assignments ?? []).filter((a) => a.kind === "intercom");
  const portofoonAssignments = (assignments ?? []).filter((a) => a.kind === "portofoon");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="comms" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CommsCard
          projectId={project.id}
          intercomAssignments={intercomAssignments}
          portofoonAssignments={portofoonAssignments}
        />
      </main>
    </div>
  );
}
