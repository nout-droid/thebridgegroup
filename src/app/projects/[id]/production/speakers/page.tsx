import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Speaker, Stage } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { SpeakerCard, SPEAKER_CARD_LABELS } from "../speaker-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionSpeakersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: speakers }, { data: stages }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("speakers")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Speaker[]>(),
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, SPEAKER_CARD_LABELS);

  // Net als bij de documentenpagina: signed URLs kunnen pas server-side worden gemaakt (private
  // 'portal-documents'-bucket), dus hier voor elke spreker met een presentatie alvast tekenen.
  const speakerRows = await Promise.all(
    (speakers ?? []).map(async (speaker) => ({
      ...speaker,
      presentationSignedUrl: speaker.presentation_url
        ? await getSignedPortalUrl(speaker.presentation_url)
        : null,
    }))
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="speakers" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <SpeakerCard projectId={project.id} speakers={speakerRows} stages={stages ?? []} t={t} />
      </main>
      <Footer />
    </div>
  );
}
