import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { MeetingNote, OpenQuestion } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { QuestionsCard, QUESTIONS_CARD_LABELS } from "../questions-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: questions }, { data: notes }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("open_questions")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<OpenQuestion[]>(),
    supabase
      .from("meeting_notes")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<MeetingNote[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, QUESTIONS_CARD_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="vragen" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <QuestionsCard projectId={project.id} questions={questions ?? []} notes={notes ?? []} t={t} />
      </main>
      <Footer />
    </div>
  );
}
