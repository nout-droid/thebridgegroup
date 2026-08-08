import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { EquipmentReservation, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { EquipmentCard, type EquipmentCardLabels } from "../equipment-card";
import { EQUIPMENT_CARD_LABELS } from "../../translation-labels";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: reservations }, { data: suppliers }, { data: stages }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("equipment_reservations")
      .select("*, supplier:suppliers(*)")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<EquipmentReservation[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, EQUIPMENT_CARD_LABELS);
  const labels: EquipmentCardLabels = {
    title: t("Materieel reservering"),
    description: t("Gehuurde machines: van wie, wanneer, en waar ligt de sleutel."),
    area: t("Podium/area"),
    allStages: t("Alle podia"),
    projectWide: t("Projectbreed"),
    date: t("Datum"),
    allDates: t("Alle datums"),
    supplier: t("Leverancier"),
    allSuppliers: t("Alle leveranciers"),
    search: t("Zoek op type/sleutelhouder"),
    searchPlaceholder: t("bv. Manitou"),
    downloadPdf: t("Materieellijst downloaden (PDF)"),
    machineTypePlaceholder: t("bv. Manitou"),
    machineType: t("Type machine"),
    quantity: t("Aantal"),
    accessories: t("Accessoires"),
    reservationDate: t("Datum reservering"),
    duration: t("Benodigde duur"),
    machineNumber: t("Machinenummer"),
    keyHolder: t("Sleutel bij"),
    pickedUp: t("Opgehaald"),
    save: t("Opslaan"),
    remove: t("Verwijderen"),
    addReservation: t("Reservering toevoegen"),
    chooseStage: t("Kies podium"),
    chooseSupplier: t("Kies leverancier"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="materieel" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <EquipmentCard
          projectId={project.id}
          reservations={reservations ?? []}
          suppliers={suppliers ?? []}
          stages={stages ?? []}
          labels={labels}
        />
      </main>
      <Footer />
    </div>
  );
}
