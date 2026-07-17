import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import type { GuestDocument } from "@/lib/types";
import { GuestDocumentsCard } from "../guest-documents-card";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectGuestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: guestDocuments } = await supabase
    .from("guest_documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .returns<GuestDocument[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="guests" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <GuestDocumentsCard project={project} documents={guestDocuments ?? []} />
      </main>
    </div>
  );
}
