import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound, getStageOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { computeClientPrice, type Category, type MaterialListItem, type Quote, type Supplier } from "@/lib/types";
import { getSupplierConflicts } from "@/lib/server/supplier-conflicts";
import { CategoryCard, CATEGORY_CARD_LABELS } from "../../category-card";
import { AddCategoryForm, ADD_CATEGORY_FORM_LABELS } from "../../add-category-form";
import { MaterialList, MATERIAL_LIST_LABELS } from "../../material-list";
import { QuotePdfImport, type QuotePdfImportLabels } from "../../quote-pdf-import";
import { QUOTE_PDF_IMPORT_LABELS } from "../../translation-labels";
import { updateStage, deleteStage } from "../actions";
import { StageSubNav } from "./stage-sub-nav";
import { computeRentalDays } from "@/lib/rental-days";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const STAGE_PAGE_LABELS = [
  "Stage",
  "Naam",
  "Opslaan",
  "Stage verwijderen",
  "Subtotaal (klant):",
  "Categorie toevoegen",
];

export default async function StagePage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;
  const supabase = await createClient();

  // project/stage zijn onafhankelijk van elkaar — parallel opvragen i.p.v. na elkaar.
  const [project, stage] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    getStageOrNotFound(supabase, id, stageId),
  ]);

  // De rest hangt alleen af van `project`/`stageId`, niet van elkaar — ook in één keer
  // parallel opvragen i.p.v. 5+ losse round-trips na elkaar.
  const [
    { data: categories },
    { data: suppliers },
    conflictsBySupplier,
    { data: materialListItems },
    { data: rentalMultiplier },
    lang,
    { data: allStages },
    { data: allProjectCategories },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("stage_id", stageId)
      .order("sort_order", { ascending: true })
      .returns<Category[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).limit(500).returns<Supplier[]>(),
    getSupplierConflicts(supabase, project),
    supabase
      .from("material_list_items")
      .select("*, matched_article:catalog_articles(*, supplier:suppliers(*))")
      .eq("project_id", id)
      .eq("stage_id", stageId)
      .order("created_at", { ascending: true })
      .returns<MaterialListItem[]>(),
    supabase.rpc("rental_multiplier", { p_days: computeRentalDays(project) }),
    getAppLang(),
    // Voor de offerte-PDF-import: alle podia + categorienamen van het hele project, niet
    // alleen dit podium — een leverancier-offerte kan meerdere podia in één upload bestrijken.
    supabase.from("stages").select("id, name").eq("project_id", id).returns<{ id: string; name: string }[]>(),
    supabase.from("categories").select("name").eq("project_id", id).returns<{ name: string }[]>(),
  ]);

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: quotes } = categoryIds.length
    ? await supabase
        .from("quotes")
        .select("*, supplier:suppliers(*), line_items:quote_line_items(*)")
        .in("category_id", categoryIds)
        .order("created_at", { ascending: true })
        .returns<Quote[]>()
    : { data: [] as Quote[] };

  const quotesByCategory = new Map<string, Quote[]>();
  for (const quote of quotes ?? []) {
    const list = quotesByCategory.get(quote.category_id) ?? [];
    list.push(quote);
    quotesByCategory.set(quote.category_id, list);
  }

  const subtotal = (categories ?? []).reduce((sum, category) => {
    const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
    return chosen ? sum + computeClientPrice(category, chosen.cost_price) : sum;
  }, 0);
  const t = await createTranslator(lang, [
    ...STAGE_PAGE_LABELS,
    ...CATEGORY_CARD_LABELS,
    ...ADD_CATEGORY_FORM_LABELS,
    ...MATERIAL_LIST_LABELS,
    ...QUOTE_PDF_IMPORT_LABELS,
    ...(categories ?? []).map((c) => c.name),
    ...(allStages ?? []).map((s) => s.name),
    ...(allProjectCategories ?? []).map((c) => c.name),
  ]);

  const quotePdfImportLabels: QuotePdfImportLabels = {
    title: t("Offerte-PDF importeren"),
    description: t(
      "Upload een offerte-PDF van een leverancier. Regels worden gekoppeld aan een categorie op basis van eerdere matches en de catalogus — controleer en corrigeer voordat je overneemt."
    ),
    supplier: t("Leverancier"),
    chooseSupplier: t("Kies leverancier"),
    busy: t("Bezig..."),
    upload: t("Uploaden"),
    noLinesFound: t(
      "Geen regels met bedragen gevonden in dit PDF-bestand. Mogelijk bevat het een gescande afbeelding zonder tekstlaag, of staan bedragen in een formaat dat niet herkend wordt."
    ),
    uploadFailed: t(
      "Uploaden mislukt. Controleer of het bestand een geldig PDF-bestand is en probeer het opnieuw."
    ),
    description2: t("Omschrijving"),
    amount: t("Bedrag"),
    category: t("Categorie"),
    stage: t("Podium"),
    projectWide: t("Projectbreed"),
    uncategorized: t("Nog te categoriseren"),
    noHeadingDetected: t("geen kop herkend"),
    newCategory: t("+ Nieuwe categorie..."),
    backToList: t("Terug naar lijst"),
    recognizedAs: t("Herkend als:"),
    remove: t("Verwijderen"),
    confirmAsQuote: t("Overnemen als offerte"),
    chooseSupplierFirst: t("Kies eerst een leverancier hierboven."),
    confirmFailed: t("Overnemen als offerte is mislukt. Probeer het opnieuw."),
    defaultStage: t("Standaard podium"),
    pendingPrefix: t("Nog te verwerken:"),
    pendingLinesSuffix: t("regel(s), totaal"),
    confirmAllCategorized: t("Bevestig alle categorieën"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <StageSubNav
        projectId={project.id}
        stageId={stage.id}
        stageName={`${project.name} — ${stage.name}`}
        active="overview"
      />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("Stage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <form
                action={updateStage.bind(null, project.id, stage.id)}
                className="flex flex-1 items-end gap-2"
              >
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="name">{t("Naam")}</Label>
                  <Input id="name" name="name" defaultValue={stage.name} required />
                </div>
                <Button type="submit" size="sm">
                  {t("Opslaan")}
                </Button>
              </form>
              <form action={deleteStage.bind(null, project.id, stage.id)}>
                <Button type="submit" size="sm" variant="ghost">
                  {t("Stage verwijderen")}
                </Button>
              </form>
            </div>

            <p className="text-lg">
              {t("Subtotaal (klant):")} <span className="font-semibold">&euro; {subtotal.toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>

        <MaterialList
          projectId={project.id}
          stageId={stage.id}
          items={materialListItems ?? []}
          suppliers={suppliers ?? []}
          rentalMultiplier={rentalMultiplier ?? 1}
          defaultMarginPercentage={project.default_margin_percentage}
          t={t}
        />

        <div className="space-y-4">
          {(categories ?? []).map((category) => (
            <CategoryCard
              key={category.id}
              projectId={project.id}
              category={category}
              quotes={quotesByCategory.get(category.id) ?? []}
              suppliers={suppliers ?? []}
              conflictsBySupplier={conflictsBySupplier}
              t={t}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Categorie toevoegen")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCategoryForm projectId={project.id} stageId={stage.id} t={t} />
          </CardContent>
        </Card>

        <QuotePdfImport
          projectId={project.id}
          stageId={stage.id}
          stages={(allStages ?? []).map((s) => ({ id: s.id, name: t(s.name) }))}
          categoryNames={Array.from(new Set((allProjectCategories ?? []).map((c) => t(c.name)))).sort()}
          suppliers={suppliers ?? []}
          labels={quotePdfImportLabels}
        />
      </main>
      <Footer />
    </div>
  );
}
