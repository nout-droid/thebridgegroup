import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CrewMember, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../project-sub-nav";
import { ProductionSubNav } from "./production-sub-nav";
import { CrewCard, CREW_CARD_LABELS } from "./crew-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionCrewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben geen onderlinge afhankelijkheid — parallel opvragen i.p.v. na
  // elkaar.
  const [project, { data: members }, { data: suppliers }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("crew_members")
      .select("*, supplier:suppliers(*)")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<CrewMember[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, CREW_CARD_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="crew" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CrewCard projectId={project.id} members={members ?? []} suppliers={suppliers ?? []} t={t} />
      </main>
      <Footer />
    </div>
  );
}
