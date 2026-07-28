import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { ArtistRider, CrewMember } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { ArtistCard, ARTIST_CARD_LABELS } from "../artist-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionArtistsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: artists } = await supabase
    .from("artist_riders")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<ArtistRider[]>();

  const { data: artistCrewMembers } = await supabase
    .from("crew_members")
    .select("*")
    .eq("project_id", id)
    .not("artist_rider_id", "is", null)
    .returns<CrewMember[]>();

  const lang = await getAppLang();
  const t = await createTranslator(lang, ARTIST_CARD_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="artiesten" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <ArtistCard
          projectId={project.id}
          artists={artists ?? []}
          crewMembers={artistCrewMembers ?? []}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
