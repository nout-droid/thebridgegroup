import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { getTeamOwnerId } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CrewMember, CrewPosition, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { CrewPlanningCard, type CrewPlanningCardLabels } from "../crew-planning-card";
import type { FreelancerOption } from "../freelancer-picker";
import { CREW_PLANNING_CARD_LABELS } from "../../translation-labels";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = user ? await getTeamOwnerId(supabase, user.id) : null;

  // Deze queries hebben alleen `id` (of ownerId) nodig — dus in één keer parallel opvragen
  // i.p.v. na elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: positions }, { data: suppliers }, { data: stages }, { data: linkedMembers }, { data: freelancers }, lang] =
    await Promise.all([
      getProjectOrNotFound(supabase, id),
      supabase
        .from("crew_positions")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .returns<CrewPosition[]>(),
      supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
      supabase
        .from("stages")
        .select("*")
        .eq("project_id", id)
        .order("name", { ascending: true })
        .returns<Stage[]>(),
      supabase
        .from("crew_members")
        .select("*")
        .eq("project_id", id)
        .not("crew_position_id", "is", null)
        .returns<CrewMember[]>(),
      ownerId
        ? supabase
            .from("freelancers")
            .select(
              "id, name, role, home_address, day_rate, overtime_rate, km_rate, sell_day_rate, sell_overtime_rate, sell_km_rate"
            )
            .eq("user_id", ownerId)
            .order("name", { ascending: true })
            .returns<FreelancerOption[]>()
        : Promise.resolve({ data: [] as FreelancerOption[] }),
      getAppLang(),
    ]);

  const t = await createTranslator(lang, CREW_PLANNING_CARD_LABELS);
  const labels: CrewPlanningCardLabels = {
    title: t("Crew Planning per podium/area"),
    description: t(
      'Leg per podium, dag en functie vast hoeveel mensen nodig zijn en wie ze levert — nog zonder namen. Vink "Accreditatie nodig" aan om automatisch lege plekken in Crew & Accreditatie aan te maken zodra dit bekend wordt.'
    ),
    area: t("Podium/area"),
    allStages: t("Alle podia"),
    projectWide: t("Projectbreed"),
    date: t("Datum"),
    allDates: t("Alle datums"),
    searchRoleName: t("Zoek op functie/naam"),
    searchPlaceholder: t("bv. Podiumtechnicus"),
    stage: t("Podium/area"),
    role: t("Functie"),
    rolePlaceholder: t("bv. Podiumtechnicus"),
    quantity: t("Aantal"),
    providedBy: t("Wie levert"),
    providedByUs: t("Wij"),
    providedByClient: t("Klant"),
    providedBySupplier: t("Leverancier"),
    supplier: t("Leverancier"),
    needsAccreditation: t("Accreditatie nodig"),
    needsCatering: t("Catering nodig"),
    needsHotel: t("Hotel nodig"),
    needsFlight: t("Vlucht nodig"),
    notes: t("Notities"),
    save: t("Opslaan"),
    add: t("Toevoegen"),
    remove: t("Verwijderen"),
    ofPositionsFilled: t("van"),
    positionsFilled: t("functies ingevuld"),
    catering: t("catering"),
    hotel: t("hotel"),
    addNewPosition: t("Nieuwe positie toevoegen"),
    chooseStage: t("Kies podium"),
    chooseSupplier: t("Kies leverancier"),
    linkedPeople: t("Gekoppelde mensen"),
    fromDatabase: t("Kies uit crewdatabase"),
    manualEntry: t("Handmatig invoeren"),
    name: t("Naam"),
    homeAddress: t("Woonadres"),
    dayRate: t("Dagtarief (€)"),
    overtimeRate: t("Overurentarief (€/uur)"),
    kmRate: t("KM-tarief (€/km)"),
    sellDayRate: t("Verkoopprijs dag (€)"),
    sellOvertimeRate: t("Verkoopprijs overuren (€/uur)"),
    sellKmRate: t("Verkoopprijs km (€/km)"),
    savePerson: t("Opslaan"),
    unlink: t("Ontkoppelen"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="planning" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CrewPlanningCard
          projectId={project.id}
          positions={positions ?? []}
          suppliers={suppliers ?? []}
          stages={stages ?? []}
          linkedMembers={linkedMembers ?? []}
          freelancers={freelancers ?? []}
          labels={labels}
        />
      </main>
      <Footer />
    </div>
  );
}
