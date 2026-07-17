import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound, getStageOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import type { ScheduleItem, Supplier } from "@/lib/types";
import { ScheduleCard } from "../../../schedule-card";
import { StageSubNav } from "../stage-sub-nav";

export default async function StageSchedulePage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);
  const stage = await getStageOrNotFound(supabase, id, stageId);

  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*, supplier:suppliers(*)")
    .eq("stage_id", stageId)
    .returns<ScheduleItem[]>();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <StageSubNav
        projectId={project.id}
        stageId={stage.id}
        stageName={`${project.name} — ${stage.name}`}
        active="schedule"
      />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <ScheduleCard
          projectId={project.id}
          stageId={stage.id}
          items={scheduleItems ?? []}
          suppliers={suppliers ?? []}
        />
      </main>
    </div>
  );
}
