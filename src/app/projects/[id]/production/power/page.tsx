import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { PowerRequest, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { PowerCard, type PowerCardLabels } from "../power-card";
import { POWER_CARD_LABELS } from "../../translation-labels";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionPowerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: requests }, { data: stages }, { data: suppliers }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("power_requests")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<PowerRequest[]>(),
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, POWER_CARD_LABELS);
  const labels: PowerCardLabels = {
    title: t("Stroom"),
    description: t("Stroomaanvragen per podium: wat, hoeveel en op welke positie."),
    area: t("Podium/area"),
    allStages: t("Alle podia"),
    projectWide: t("Projectbreed"),
    downloadPdf: t("Stroomaanvraag downloaden (PDF)"),
    stage: t("Podium"),
    what: t("Wat"),
    whatPlaceholder: t("bv. 32A 3-fase"),
    quantity: t("Aantal"),
    position: t("Positie"),
    positionPlaceholder: t("bv. Stage links"),
    supplier: t("Leverancier"),
    save: t("Opslaan"),
    remove: t("Verwijderen"),
    notes: t("Opmerkingen"),
    addRequest: t("Aanvraag toevoegen"),
    chooseStage: t("Kies podium"),
    chooseSupplier: t("Kies leverancier"),
    amps: t("Ampère"),
    ampsPlaceholder: t("bv. 32"),
    phase: t("Fase"),
    singlePhase: t("1-fase"),
    threePhase: t("3-fase"),
    loadPerArea: t("Belasting per area (kW)"),
    totalLoad: t("Totale belasting"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="power" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <PowerCard
          projectId={project.id}
          requests={requests ?? []}
          stages={stages ?? []}
          suppliers={suppliers ?? []}
          labels={labels}
        />
      </main>
      <Footer />
    </div>
  );
}
