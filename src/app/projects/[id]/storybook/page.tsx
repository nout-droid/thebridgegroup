import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { StorybookChapter, StorybookImage } from "@/lib/types";
import { StorybookCard, STORYBOOK_CARD_LABELS } from "./storybook-card";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProjectStorybookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, { data: chapters }, { data: images }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("storybook_chapters")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Omit<StorybookChapter, "images">[]>(),
    supabase
      .from("storybook_images")
      .select("*, chapter:storybook_chapters!inner(project_id)")
      .eq("chapter.project_id", id)
      .order("sort_order", { ascending: true })
      .returns<(StorybookImage & { chapter: { project_id: string } })[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, STORYBOOK_CARD_LABELS);

  const fullChapters: StorybookChapter[] = (chapters ?? []).map((chapter) => ({
    ...chapter,
    images: (images ?? []).filter((image) => image.chapter_id === chapter.id),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="storybook" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <StorybookCard projectId={project.id} chapters={fullChapters} t={t} />
      </main>
      <Footer />
    </div>
  );
}
