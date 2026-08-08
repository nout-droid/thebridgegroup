import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CommsAssignment, CrewMember, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { CommsCard, type CommsCardLabels } from "../comms-card";
import { COMMS_CARD_LABELS } from "../../translation-labels";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionCommsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: assignments }, { data: suppliers }, { data: crewMembers }, { data: stages }, lang] =
    await Promise.all([
      getProjectOrNotFound(supabase, id),
      supabase
        .from("comms_assignments")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .returns<CommsAssignment[]>(),
      supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
      supabase
        .from("crew_members")
        .select("*")
        .eq("project_id", id)
        .order("name", { ascending: true })
        .returns<CrewMember[]>(),
      supabase
        .from("stages")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .returns<Stage[]>(),
      getAppLang(),
    ]);

  const intercomAssignments = (assignments ?? []).filter((a) => a.kind === "intercom");
  const portofoonAssignments = (assignments ?? []).filter((a) => a.kind === "portofoon");

  const t = await createTranslator(lang, COMMS_CARD_LABELS);
  const labels: CommsCardLabels = {
    title: t("Comms & Portofoons"),
    description: t("Wie zit op welk intercom-kanaal en welke portofoon-groep."),
    area: t("Podium/area"),
    allStages: t("Alle podia"),
    projectWide: t("Projectbreed"),
    supplier: t("Leverancier"),
    allSuppliers: t("Alle leveranciers"),
    searchUser: t("Zoek op gebruiker"),
    searchUserPlaceholder: t("bv. Jan"),
    downloadPdf: t("Comms & portofoons downloaden (PDF)"),
    user: t("Gebruiker"),
    save: t("Opslaan"),
    remove: t("Verwijderen"),
    crewMember: t("Crewlid (optioneel)"),
    add: t("Toevoegen"),
    intercomTitle: t("Intercom-toewijzing"),
    intercomDescription: t("Bijvoorbeeld Show, Audio, Video, Licht, Stage."),
    intercomDeviceLabel: t("Type"),
    intercomDevicePlaceholder: t("bv. Wireless"),
    intercomChannelsLabel: t("Kanalen"),
    intercomChannelsPlaceholder: t("bv. Show, Stage"),
    portofoonTitle: t("Portofoon-toewijzing"),
    portofoonDescription: t("Bijvoorbeeld 1: Productie, 2: Horeca, 3: Techniek, 4: Beveiliging, 5: Special FX."),
    portofoonDeviceLabel: t("Portofoon"),
    portofoonDevicePlaceholder: t("bv. kanaal 3"),
    portofoonChannelsLabel: t("Groepen"),
    portofoonChannelsPlaceholder: t("bv. 1: Productie, 4: Beveiliging"),
    chooseStage: t("Kies podium"),
    chooseSupplier: t("Kies leverancier"),
    chooseCrewMember: t("Geen koppeling"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="comms" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CommsCard
          projectId={project.id}
          intercomAssignments={intercomAssignments}
          portofoonAssignments={portofoonAssignments}
          suppliers={suppliers ?? []}
          crewMembers={crewMembers ?? []}
          stages={stages ?? []}
          labels={labels}
        />
      </main>
      <Footer />
    </div>
  );
}
