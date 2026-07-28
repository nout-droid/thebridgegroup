import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { getOrCreateRundown } from "@/lib/server/ensure-rundown";
import { computeShowDates, pickDefaultShowDate } from "@/lib/show-dates";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Rundown, RundownItem, Stage } from "@/lib/types";
import { ProjectSubNav } from "../project-sub-nav";
import { RundownLive, type RundownLiveLabels } from "../rundown-live";
import { RundownAccessCard, RUNDOWN_ACCESS_CARD_LABELS } from "../rundown-access-card";
import { RundownDayTabs } from "../rundown-day-tabs";
import { RUNDOWN_LIVE_LABELS } from "../translation-labels";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProjectRundownPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date } = await searchParams;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const showDates = computeShowDates(project);
  const showDate = date && showDates.includes(date) ? date : pickDefaultShowDate(showDates);

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

  const rundownId = await getOrCreateRundown(supabase, id, null, showDate);

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

  const lang = await getAppLang();
  const t = await createTranslator(lang, [...RUNDOWN_ACCESS_CARD_LABELS, ...RUNDOWN_LIVE_LABELS]);

  const rundownLiveLabels: RundownLiveLabels = {
    title: t("Show rundown"),
    description: t(
      "Cue-tijden schuiven automatisch door. Live tracking sync't mee op elk scherm dat deze pagina open heeft."
    ),
    openClock: t("Open klok"),
    startShow: t("Start show"),
    busy: t("Bezig…"),
    previous: t("Vorige"),
    next: t("Volgende"),
    stopShow: t("Stop show"),
    totalOvertime: t("Totaal opgelopen:"),
    startTimeLabel: t("Starttijd show"),
    save: t("Opslaan"),
    overTime: t("Over tijd:"),
    remaining: t("Resterend:"),
    cue: t("Cue"),
    name: t("Naam"),
    duration: t("Duur (mm:ss)"),
    color: t("Kleur"),
    notes: t("Notities"),
    remove: t("Verwijderen"),
    instructionsPerDivision: t("Opdrachten per devisie"),
    division: t("Devisie"),
    instruction: t("Opdracht"),
    instructionPlaceholder: t("bv. HH 1 open zetten"),
    add: t("Toevoegen"),
    newCuePlaceholder: t("bv. 1"),
    newNamePlaceholder: t("bv. Opening VJ set"),
    newDurationPlaceholder: t("bv. 3:00"),
    addCue: t("Cue toevoegen"),
    colorLabels: {
      none: t("Geen"),
      red: t("Rood"),
      orange: t("Oranje"),
      yellow: t("Geel"),
      green: t("Groen"),
      blue: t("Blauw"),
      purple: t("Paars"),
    },
  };

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
          t={t}
        />

        <RundownDayTabs
          basePath={`/projects/${project.id}/rundown`}
          dates={showDates}
          selected={showDate}
        />

        {rundown && (
          <RundownLive
            projectId={project.id}
            stageId={null}
            rundownId={rundown.id}
            shareToken={project.share_token}
            initialRundown={rundown}
            initialItems={items ?? []}
            labels={rundownLiveLabels}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
