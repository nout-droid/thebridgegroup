import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import type { MeetingNote, OpenQuestion } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { QuestionsCard } from "../questions-card";

export default async function ProductionQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: questions } = await supabase
    .from("open_questions")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<OpenQuestion[]>();

  const { data: notes } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<MeetingNote[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="vragen" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <QuestionsCard projectId={project.id} questions={questions ?? []} notes={notes ?? []} />
      </main>
    </div>
  );
}
