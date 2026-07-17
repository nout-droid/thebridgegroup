import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import type { ScheduleItem, Supplier } from "@/lib/types";
import { ScheduleCard } from "../schedule-card";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*, supplier:suppliers(*)")
    .eq("project_id", id)
    .is("stage_id", null)
    .returns<ScheduleItem[]>();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="schedule" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <ScheduleCard
          projectId={project.id}
          stageId={null}
          items={scheduleItems ?? []}
          suppliers={suppliers ?? []}
        />
      </main>
    </div>
  );
}
