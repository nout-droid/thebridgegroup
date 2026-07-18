import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { getOrCreateRundown } from "@/lib/server/ensure-rundown";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Rundown, RundownItem, Stage } from "@/lib/types";
import { ProjectSubNav } from "../project-sub-nav";
import { RundownLive } from "../rundown-live";
import { RundownAccessCard } from "../rundown-access-card";

export default async function ProjectRundownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const crewPortalUrl = `${protocol}://${host}/crew-portal`;
  const showcallerPortalUrl = `${protocol}://${host}/showcaller-portal`;

  const { data: stages } = await supabase
    .from("stages")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Stage[]>();

  const rundownId = await getOrCreateRundown(supabase, id, null);

  const { data: rundown } = rundownId
    ? await supabase.from("rundowns").select("*").eq("id", rundownId).maybeSingle<Rundown>()
    : { data: null };

  const { data: items } = rundownId
    ? await supabase
        .from("rundown_items")
        .select("*, instructions:rundown_item_instructions(*)")
        .eq("rundown_id", rundownId)
        .order("sort_order", { ascending: true })
        .order("sort_order", { foreignTable: "rundown_item_instructions", ascending: true })
        .returns<RundownItem[]>()
    : { data: [] as RundownItem[] };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="rundown" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <RundownAccessCard
          project={project}
          stages={stages ?? []}
          crewPortalUrl={crewPortalUrl}
          showcallerPortalUrl={showcallerPortalUrl}
        />

        {rundown && (
          <RundownLive
            projectId={project.id}
            stageId={null}
            rundownId={rundown.id}
            shareToken={project.share_token}
            initialRundown={rundown}
            initialItems={items ?? []}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
