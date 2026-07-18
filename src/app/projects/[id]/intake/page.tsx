import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { ensureIntakeChecklist } from "@/lib/server/ensure-intake-checklist";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { IntakeChecklistAnswer } from "@/lib/types";
import { IntakeChecklistCard } from "../intake-checklist-card";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectIntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const checklistId = await ensureIntakeChecklist(supabase, id);

  const { data: answers } = checklistId
    ? await supabase
        .from("intake_checklist_answers")
        .select("*")
        .eq("checklist_id", checklistId)
        .returns<IntakeChecklistAnswer[]>()
    : { data: [] as IntakeChecklistAnswer[] };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="intake" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <IntakeChecklistCard projectId={project.id} answers={answers ?? []} />
      </main>
      <Footer />
    </div>
  );
}
