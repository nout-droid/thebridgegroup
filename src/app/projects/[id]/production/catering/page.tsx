import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CateringOrder, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { CateringCard, CATERING_CARD_LABELS } from "../catering-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionCateringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: orders }, { data: suppliers }, { data: stages }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("catering_orders")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<CateringOrder[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, CATERING_CARD_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="catering" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CateringCard
          projectId={project.id}
          orders={orders ?? []}
          suppliers={suppliers ?? []}
          stages={stages ?? []}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
