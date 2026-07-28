import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound, getStageOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { ScheduleItem, Supplier } from "@/lib/types";
import { ScheduleCard, type ScheduleCardLabels } from "../../../schedule-card";
import { SCHEDULE_CARD_LABELS } from "../../../translation-labels";
import { StageSubNav } from "../stage-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function StageSchedulePage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);
  const stage = await getStageOrNotFound(supabase, id, stageId);

  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*, suppliers:schedule_item_suppliers(*, supplier:suppliers(*))")
    .eq("stage_id", stageId)
    .order("sort_order", { foreignTable: "schedule_item_suppliers", ascending: true })
    .returns<ScheduleItem[]>();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  const lang = await getAppLang();
  const t = await createTranslator(lang, SCHEDULE_CARD_LABELS);
  const labels: ScheduleCardLabels = {
    title: t("Draaiboek"),
    description: t("Tijdlijn van activiteiten, van opbouw tot afbraak."),
    downloadPdf: t("Draaiboek downloaden (PDF)"),
    date: t("Datum"),
    time: t("Tijd"),
    activity: t("Activiteit"),
    priority: t("Prioriteit"),
    notes: t("Notities"),
    save: t("Opslaan"),
    remove: t("Verwijderen"),
    performers: t("Uitvoerders"),
    unknown: t("Onbekend"),
    removeSupplier: t("verwijderen"),
    add: t("Toevoegen"),
    newActivityPlaceholder: t("bv. Start load in licht"),
    addActivity: t("Activiteit toevoegen"),
    addPerformersHint: t("Uitvoerders (leveranciers) voeg je toe nadat de activiteit is aangemaakt."),
    chooseSupplier: t("Kies leverancier"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <StageSubNav
        projectId={project.id}
        stageId={stage.id}
        stageName={`${project.name} — ${stage.name}`}
        active="schedule"
      />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <ScheduleCard
          projectId={project.id}
          stageId={stage.id}
          items={scheduleItems ?? []}
          suppliers={suppliers ?? []}
          labels={labels}
        />
      </main>
      <Footer />
    </div>
  );
}
