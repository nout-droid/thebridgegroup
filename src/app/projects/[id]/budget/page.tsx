import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { checkCanViewBudget } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CATEGORY_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  computeClientPrice,
  type ActualCost,
  type Category,
  type MaterialListItem,
  type Quote,
  type Stage,
  type Supplier,
} from "@/lib/types";
import { getSupplierConflicts, type SupplierConflict } from "@/lib/server/supplier-conflicts";
import { getCategoryPriceBenchmarks, type PriceBenchmark } from "@/lib/server/category-price-benchmarks";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { CategoryCard, CATEGORY_CARD_LABELS, type ActualCostRow } from "../category-card";
import { AddCategoryForm, ADD_CATEGORY_FORM_LABELS } from "../add-category-form";
import { MaterialList, MATERIAL_LIST_LABELS } from "../material-list";
import { QuotePdfImport, type QuotePdfImportLabels } from "../quote-pdf-import";
import { RequestQuotesCard, type RequestQuotesCardLabels } from "../request-quotes-card";
import { QUOTE_PDF_IMPORT_LABELS, REQUEST_QUOTES_CARD_LABELS } from "../translation-labels";
import { ActualCostsSummaryCard, ACTUAL_COSTS_SUMMARY_LABELS } from "../actual-costs-summary-card";
import { ProjectSubNav } from "../project-sub-nav";
import { updateProjectBudget, updateInvoiceDetails } from "../actions";
import { setInvoiceStatus, pushInvoiceToMoneybirdAction } from "../invoice-actions";
import { computeRentalDays } from "@/lib/rental-days";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator, type Translator } from "@/lib/server/translate";
import { PdfDownloadLink } from "@/components/pdf-download-link";
import { isMoneybirdConfigured } from "@/lib/server/moneybird";

// Het parsen van een offerte-PDF matcht elke regel tegen de catalogus (RPC-aanroepen) —
// bij een offerte met honderden regels kan dat de standaard 10-15s functie-timeout
// overschrijden, ook al lopen die aanroepen parallel.
export const maxDuration = 120;

interface Totals {
  cost: number;
  client: number;
}

const BUDGET_PAGE_LABELS = [
  "Factuur downloaden (PDF)",
  "Offerte downloaden (PDF)",
  "Naar Moneybird sturen",
  "Verstuurd naar Moneybird",
  "Download in het Nederlands",
  "Download in het Engels",
  "Factuurstatus",
  "Bijwerken",
  "Factuurnr.",
  "wordt aangemaakt bij eerste download",
  "Totaaloverzicht",
  "Totaal inkoop",
  "Totaal marge",
  "Totaal klantprijs",
  "Alle categorieën zijn bevestigd.",
  "van",
  "categorieën nog niet bevestigd:",
  "Offerte & factuur gegevens",
  "Klantreferentie (optioneel)",
  "Bv. PO-2026-014",
  "Offerte-opmerkingen (optioneel)",
  "Vrije tekst die onderaan de offerte-PDF wordt getoond, bv. voorwaarden of een toelichting.",
  "Budget klant",
  "Nog geen klantbudget ingesteld.",
  "Budget klant (€)",
  "Standaardmarge (%)",
  "Opslaan",
  "Fase 1 — Materiaallijst & begroting",
  "Materiaallijst uploaden en matchen met de catalogus, resulterend in een kosteninschatting per categorie. Deze lijst is voor projectbrede materialen — voor materiaal per podium, upload de lijst op de betreffende podiumpagina.",
  "Fase 2 — Offertes",
  "Offertes van leveranciers uitvragen en bevestigen, op basis van de begroting hierboven.",
  "Categorieën per podium",
  "Het resultaat van de offertes hierboven: gekozen en aangevraagde offertes per categorie.",
  "Overige kosten (projectbreed)",
  "Naar podium →",
  "Subtotaal:",
  "inkoop",
  "marge",
  "Nog geen categorieën.",
  ...Object.values(CATEGORY_STATUS_LABELS),
  ...Object.values(INVOICE_STATUS_LABELS),
];

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function sumCategories(categories: Category[], quotesByCategory: Map<string, Quote[]>): Totals {
  return categories.reduce(
    (acc, category) => {
      const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
      const cost = chosen?.cost_price ?? category.manual_cost;
      if (cost === null || cost === undefined) return acc;
      acc.cost += cost;
      acc.client += computeClientPrice(category, cost);
      return acc;
    },
    { cost: 0, client: 0 }
  );
}

function BudgetGroup({
  title,
  categories,
  quotesByCategory,
  suppliers,
  conflictsBySupplier,
  actualCostsByCategory,
  priceBenchmarks,
  projectId,
  stageId,
  t,
}: {
  title: string;
  categories: Category[];
  quotesByCategory: Map<string, Quote[]>;
  suppliers: Supplier[];
  conflictsBySupplier: Map<string, SupplierConflict[]>;
  actualCostsByCategory: Map<string, ActualCostRow[]>;
  priceBenchmarks: Map<string, PriceBenchmark>;
  projectId: string;
  stageId: string | null;
  t: Translator;
}) {
  const totals = sumCategories(categories, quotesByCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <h3 className="text-base font-semibold">
          {t(title)}
          {stageId && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}`}
              className="ml-2 text-xs font-normal text-primary hover:underline"
            >
              {t("Naar podium →")}
            </Link>
          )}
        </h3>
        {categories.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("Subtotaal:")} <span className="font-medium text-foreground">{euro(totals.client)}</span>{" "}
            <span className="text-xs">
              ({t("inkoop")} {euro(totals.cost)} · {t("marge")} {euro(totals.client - totals.cost)})
            </span>
          </p>
        )}
      </div>
      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("Nog geen categorieën.")}</p>
      )}
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          projectId={projectId}
          category={category}
          quotes={quotesByCategory.get(category.id) ?? []}
          suppliers={suppliers}
          conflictsBySupplier={conflictsBySupplier}
          actualCosts={actualCostsByCategory.get(category.id) ?? []}
          priceBenchmark={priceBenchmarks.get(category.name.trim())}
          t={t}
        />
      ))}
      <AddCategoryForm projectId={projectId} stageId={stageId} t={t} />
    </div>
  );
}

export default async function ProjectBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  // Deze queries hebben alleen `project`/`id` nodig (geen onderlinge afhankelijkheid) —
  // in één keer parallel opvragen i.p.v. na elkaar, anders wacht de pagina op 6+ losse
  // round-trips naar Supabase voor er iets gerenderd wordt.
  const [
    canViewBudget,
    { data: stages },
    { data: categories },
    { data: suppliers },
    conflictsBySupplier,
    { data: materialListItems },
    { data: rentalMultiplier },
    { data: actualCosts },
    { data: organization },
    lang,
  ] = await Promise.all([
    checkCanViewBudget(supabase, id),
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    supabase
      .from("categories")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Category[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    getSupplierConflicts(supabase, project),
    supabase
      .from("material_list_items")
      .select("*, matched_article:catalog_articles(*, supplier:suppliers(*))")
      .eq("project_id", id)
      .is("stage_id", null)
      .order("created_at", { ascending: true })
      .returns<MaterialListItem[]>(),
    supabase.rpc("rental_multiplier", { p_days: computeRentalDays(project) }),
    supabase
      .from("actual_costs")
      .select("*, supplier:suppliers(*)")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<ActualCost[]>(),
    supabase
      .from("organizations")
      .select("moneybird_administration_id, moneybird_access_token")
      .eq("owner_user_id", project.user_id)
      .maybeSingle(),
    getAppLang(),
  ]);

  if (!canViewBudget) notFound();

  const projectWideCategories = (categories ?? []).filter((c) => !c.stage_id);
  const categoriesByStage = new Map<string, Category[]>();
  for (const category of categories ?? []) {
    if (!category.stage_id) continue;
    const list = categoriesByStage.get(category.stage_id) ?? [];
    list.push(category);
    categoriesByStage.set(category.stage_id, list);
  }

  // Gemiddelde beoordeling per leverancier, om een waarschuwing te tonen bij het uitvragen
  // van een leverancier met een structureel lage score — zelfde berekening als op /suppliers.
  // Deze twee hangen alleen af van de eerste Promise.all hierboven, niet van elkaar — parallel
  // opvragen i.p.v. na elkaar.
  const supplierIds = (suppliers ?? []).map((s) => s.id);
  const categoryIds = (categories ?? []).map((c) => c.id);
  const [{ data: supplierRatings }, { data: quotes }, priceBenchmarks] = await Promise.all([
    supplierIds.length
      ? supabase.from("supplier_ratings").select("supplier_id, rating").in("supplier_id", supplierIds)
      : Promise.resolve({ data: [] as { supplier_id: string; rating: number }[] }),
    categoryIds.length
      ? supabase
          .from("quotes")
          .select("*, supplier:suppliers(*), line_items:quote_line_items(*)")
          .in("category_id", categoryIds)
          .order("created_at", { ascending: true })
          .returns<Quote[]>()
      : Promise.resolve({ data: [] as Quote[] }),
    getCategoryPriceBenchmarks(supabase, project.user_id),
  ]);
  const ratingsBySupplier = new Map<string, number[]>();
  for (const r of supplierRatings ?? []) {
    const list = ratingsBySupplier.get(r.supplier_id) ?? [];
    list.push(r.rating);
    ratingsBySupplier.set(r.supplier_id, list);
  }
  const suppliersWithRatings: Supplier[] = (suppliers ?? []).map((s) => {
    const list = ratingsBySupplier.get(s.id);
    return list?.length
      ? { ...s, avg_rating: list.reduce((sum, n) => sum + n, 0) / list.length, rating_count: list.length }
      : { ...s, avg_rating: null, rating_count: 0 };
  });

  const quotesByCategory = new Map<string, Quote[]>();
  for (const quote of quotes ?? []) {
    const list = quotesByCategory.get(quote.category_id) ?? [];
    list.push(quote);
    quotesByCategory.set(quote.category_id, list);
  }

  // Signed download-URL's voor eventuele bijgevoegde factuur-PDF's per werkelijke kost
  // worden hier al opgehaald (Promise.all, "portal-documents" is een privé bucket) —
  // zelfde patroon als src/app/projects/[id]/documents/page.tsx — zodat category-card.tsx
  // en de projectbrede samenvattingskaart hieronder zelf geen extra round-trip nodig hebben.
  const actualCostsWithUrls: ActualCostRow[] = await Promise.all(
    (actualCosts ?? []).map(async (actualCost) => ({
      ...actualCost,
      url: actualCost.document_url ? await getSignedPortalUrl(actualCost.document_url) : null,
    }))
  );

  const actualCostsByCategory = new Map<string, ActualCostRow[]>();
  const unlinkedActualCosts: ActualCostRow[] = [];
  for (const actualCost of actualCostsWithUrls) {
    if (actualCost.category_id) {
      const list = actualCostsByCategory.get(actualCost.category_id) ?? [];
      list.push(actualCost);
      actualCostsByCategory.set(actualCost.category_id, list);
    } else {
      unlinkedActualCosts.push(actualCost);
    }
  }
  const totalActualCost = actualCostsWithUrls.reduce((sum, actualCost) => sum + actualCost.amount, 0);

  const grandTotal = sumCategories(categories ?? [], quotesByCategory);
  const openCategories = (categories ?? []).filter((c) => c.status !== "bevestigd");
  const t = await createTranslator(lang, [
    ...BUDGET_PAGE_LABELS,
    ...CATEGORY_CARD_LABELS,
    ...ADD_CATEGORY_FORM_LABELS,
    ...MATERIAL_LIST_LABELS,
    ...QUOTE_PDF_IMPORT_LABELS,
    ...REQUEST_QUOTES_CARD_LABELS,
    ...ACTUAL_COSTS_SUMMARY_LABELS,
    ...(categories ?? []).map((c) => c.name),
    ...(stages ?? []).map((s) => s.name),
  ]);

  const quotePdfImportLabels: QuotePdfImportLabels = {
    title: t("Offerte-PDF importeren"),
    description: t(
      "Upload een offerte-PDF van een leverancier. Regels worden gekoppeld aan een categorie op basis van eerdere matches en de catalogus — controleer en corrigeer voordat je overneemt. Herkent de leverancier eigen kopregels per podium of discipline, dan worden regels daaronder automatisch aan het juiste podium gekoppeld."
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

  const requestQuotesCardLabels: RequestQuotesCardLabels = {
    title: t("Leverancier uitnodigen voor meerdere categorieën"),
    description: t(
      "Kies een leverancier en vink de categorieën aan waar je een offerte voor wilt — bijvoorbeeld alleen Licht + Rigging, zonder dat deze leverancier iets van Layher te zien krijgt. Alle technische info en tekeningen vindt de leverancier onder Event rider."
    ),
    supplier: t("Leverancier"),
    chooseSupplier: t("Kies leverancier"),
    sendRequest: t("Aanvraag versturen"),
    unknownStage: t("Onbekend podium"),
    projectWide: t("Projectbreed"),
    lowRating: t("Lage beoordeling"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="budget" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{t("Totaaloverzicht")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t("Factuurnr.")}</span>
                <span className="font-medium text-foreground">
                  {project.invoice_number ?? t("wordt aangemaakt bij eerste download")}
                </span>
                <Badge variant={project.invoice_status === "paid" ? "default" : "secondary"}>
                  {t(INVOICE_STATUS_LABELS[project.invoice_status])}
                </Badge>
              </div>
              <form
                action={setInvoiceStatus.bind(null, project.id)}
                className="flex items-center gap-1.5"
              >
                <Select
                  name="invoice_status"
                  defaultValue={project.invoice_status}
                  items={Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label: t(label),
                  }))}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {t(label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  {t("Bijwerken")}
                </Button>
              </form>
              <PdfDownloadLink
                href={`/projects/${project.id}/budget/quote`}
                label={t("Offerte downloaden (PDF)")}
                nlTitle={t("Download in het Nederlands")}
                enTitle={t("Download in het Engels")}
              />
              <PdfDownloadLink
                href={`/projects/${project.id}/budget/invoice`}
                label={t("Factuur downloaden (PDF)")}
                nlTitle={t("Download in het Nederlands")}
                enTitle={t("Download in het Engels")}
              />
              {isMoneybirdConfigured(organization) && (
                <form action={pushInvoiceToMoneybirdAction.bind(null, project.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    {project.moneybird_synced_at ? t("Verstuurd naar Moneybird") : t("Naar Moneybird sturen")}
                  </Button>
                </form>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <details className="group mb-4 rounded-md border">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
                {t("Offerte & factuur gegevens")}
              </summary>
              <form
                action={updateInvoiceDetails.bind(null, project.id)}
                className="grid grid-cols-1 gap-3 border-t p-3 sm:grid-cols-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="client_reference">{t("Klantreferentie (optioneel)")}</Label>
                  <Input
                    id="client_reference"
                    name="client_reference"
                    placeholder={t("Bv. PO-2026-014")}
                    defaultValue={project.client_reference ?? ""}
                  />
                </div>
                <div className="sm:row-span-2 sm:space-y-1.5">
                  <Label htmlFor="quote_notes">{t("Offerte-opmerkingen (optioneel)")}</Label>
                  <Textarea
                    id="quote_notes"
                    name="quote_notes"
                    rows={3}
                    className="mt-1.5 sm:mt-0"
                    defaultValue={project.quote_notes ?? ""}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      "Vrije tekst die onderaan de offerte-PDF wordt getoond, bv. voorwaarden of een toelichting."
                    )}
                  </p>
                </div>
                <Button type="submit" size="sm" className="w-fit">
                  {t("Opslaan")}
                </Button>
              </form>
            </details>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("Totaal inkoop")}</p>
                <p className="text-xl font-semibold">{euro(grandTotal.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Totaal marge")}</p>
                <p className="text-xl font-semibold">
                  {euro(grandTotal.client - grandTotal.cost)}
                  {grandTotal.cost > 0 && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      ({(((grandTotal.client - grandTotal.cost) / grandTotal.cost) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Totaal klantprijs")}</p>
                <p className="text-xl font-semibold">{euro(grandTotal.client)}</p>
              </div>
            </div>
            {(categories ?? []).length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {openCategories.length === 0
                  ? t("Alle categorieën zijn bevestigd.")
                  : `${openCategories.length} ${t("van")} ${categories?.length} ${t(
                      "categorieën nog niet bevestigd:"
                    )} ${openCategories
                      .map((c) => `${t(c.name)} (${t(CATEGORY_STATUS_LABELS[c.status])})`)
                      .join(", ")}`}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("Budget klant")}</p>
                {project.client_budget != null ? (
                  <p className="text-xl font-semibold">
                    {euro(grandTotal.client)} {t("van")} {euro(project.client_budget)}
                    <span
                      className={cn(
                        "ml-1 text-sm font-normal",
                        grandTotal.client / project.client_budget > 1
                          ? "text-destructive"
                          : grandTotal.client / project.client_budget > 0.9
                            ? "text-yellow-600"
                            : "text-muted-foreground"
                      )}
                    >
                      ({((grandTotal.client / project.client_budget) * 100).toFixed(0)}%)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("Nog geen klantbudget ingesteld.")}</p>
                )}
              </div>
              <form
                action={updateProjectBudget.bind(null, project.id)}
                className="flex flex-wrap items-end gap-2"
              >
                <div className="space-y-1">
                  <Label htmlFor="client_budget" className="text-xs">
                    {t("Budget klant (€)")}
                  </Label>
                  <Input
                    id="client_budget"
                    name="client_budget"
                    type="number"
                    step="0.01"
                    defaultValue={project.client_budget ?? ""}
                    className="h-8 w-32 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="default_margin_percentage" className="text-xs">
                    {t("Standaardmarge (%)")}
                  </Label>
                  <Input
                    id="default_margin_percentage"
                    name="default_margin_percentage"
                    type="number"
                    step="0.1"
                    defaultValue={project.default_margin_percentage}
                    className="h-8 w-24 text-xs"
                  />
                </div>
                <Button type="submit" size="sm">
                  {t("Opslaan")}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <ActualCostsSummaryCard
          projectId={project.id}
          totalBudgeted={grandTotal.cost}
          totalActual={totalActualCost}
          unlinkedActualCosts={unlinkedActualCosts}
          t={t}
        />

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">{t("Fase 1 — Materiaallijst & begroting")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Materiaallijst uploaden en matchen met de catalogus, resulterend in een kosteninschatting per categorie. Deze lijst is voor projectbrede materialen — voor materiaal per podium, upload de lijst op de betreffende podiumpagina."
            )}
          </p>
        </div>

        <MaterialList
          projectId={project.id}
          stageId={null}
          items={materialListItems ?? []}
          suppliers={suppliers ?? []}
          rentalMultiplier={rentalMultiplier ?? 1}
          defaultMarginPercentage={project.default_margin_percentage}
          t={t}
        />

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">{t("Fase 2 — Offertes")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Offertes van leveranciers uitvragen en bevestigen, op basis van de begroting hierboven.")}
          </p>
        </div>

        <RequestQuotesCard
          projectId={project.id}
          categories={categories ?? []}
          suppliers={suppliersWithRatings}
          labels={requestQuotesCardLabels}
          categoryLabels={Object.fromEntries((categories ?? []).map((c) => [c.id, t(c.name)]))}
          stageLabels={Object.fromEntries((stages ?? []).map((s) => [s.id, t(s.name)]))}
        />

        <QuotePdfImport
          projectId={project.id}
          stageId={null}
          stages={(stages ?? []).map((s) => ({ id: s.id, name: t(s.name) }))}
          categoryNames={Array.from(new Set((categories ?? []).map((c) => t(c.name)))).sort()}
          suppliers={suppliers ?? []}
          labels={quotePdfImportLabels}
        />

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">{t("Categorieën per podium")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Het resultaat van de offertes hierboven: gekozen en aangevraagde offertes per categorie.")}
          </p>
        </div>

        {(stages ?? []).map((stage) => (
          <BudgetGroup
            key={stage.id}
            title={stage.name}
            categories={categoriesByStage.get(stage.id) ?? []}
            quotesByCategory={quotesByCategory}
            suppliers={suppliersWithRatings}
            conflictsBySupplier={conflictsBySupplier}
            actualCostsByCategory={actualCostsByCategory}
            priceBenchmarks={priceBenchmarks}
            projectId={project.id}
            stageId={stage.id}
            t={t}
          />
        ))}

        <BudgetGroup
          title="Overige kosten (projectbreed)"
          categories={projectWideCategories}
          quotesByCategory={quotesByCategory}
          suppliers={suppliersWithRatings}
          conflictsBySupplier={conflictsBySupplier}
          actualCostsByCategory={actualCostsByCategory}
          priceBenchmarks={priceBenchmarks}
          projectId={project.id}
          stageId={null}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
