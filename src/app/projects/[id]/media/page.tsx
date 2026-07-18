import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { ProjectMedia } from "@/lib/types";
import { ProjectMediaCard } from "../project-media";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: media } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<ProjectMedia[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="media" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <ProjectMediaCard
          projectId={project.id}
          backgroundImageUrl={project.background_image_url}
          media={media ?? []}
        />
      </main>
      <Footer />
    </div>
  );
}
