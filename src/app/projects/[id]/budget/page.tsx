import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { checkCanViewBudget } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_STATUS_LABELS,
  computeClientPrice,
  type Category,
  type MaterialListItem,
  type Quote,
  type Stage,
  type Supplier,
} from "@/lib/types";
import { CategoryCard } from "../category-card";
import { AddCategoryForm } from "../add-category-form";
import { MaterialList } from "../material-list";
import { QuotePdfImport } from "../quote-pdf-import";
import { RequestQuotesCard } from "../request-quotes-card";
import { ProjectSubNav } from "../project-sub-nav";
import { updateProjectBudget } from "../actions";
import { computeRentalDays } from "@/lib/rental-days";

// Het parsen van een offerte-PDF matcht elke regel tegen de catalogus (RPC-aanroepen) —
// bij een offerte met honderden regels kan dat de standaard 10-15s functie-timeout
// overschrijden, ook al lopen die aanroepen parallel.
export const maxDuration = 120;

interface Totals {
  cost: number;
  client: number;
}

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
  projectId,
  stageId,
}: {
  title: string;
  categories: Category[];
  quotesByCategory: Map<string, Quote[]>;
  suppliers: Supplier[];
  projectId: string;
  stageId: string | null;
}) {
  const totals = sumCategories(categories, quotesByCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <h3 className="text-base font-semibold">
          {title}
          {stageId && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}`}
              className="ml-2 text-xs font-normal text-primary hover:underline"
            >
              Naar podium &rarr;
            </Link>
          )}
        </h3>
        {categories.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Subtotaal: <span className="font-medium text-foreground">{euro(totals.client)}</span>{" "}
            <span className="text-xs">
              (inkoop {euro(totals.cost)} · marge {euro(totals.client - totals.cost)})
            </span>
          </p>
        )}
      </div>
      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">Nog geen categorieën.</p>
      )}
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          projectId={projectId}
          category={category}
          quotes={quotesByCategory.get(category.id) ?? []}
          suppliers={suppliers}
        />
      ))}
      <AddCategoryForm projectId={projectId} stageId={stageId} />
    </div>
  );
}

export default async function ProjectBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);
  if (!(await checkCanViewBudget(supabase, id))) notFound();

  const { data: stages } = await supabase
    .from("stages")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Stage[]>();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

  const projectWideCategories = (categories ?? []).filter((c) => !c.stage_id);
  const categoriesByStage = new Map<string, Category[]>();
  for (const category of categories ?? []) {
    if (!category.stage_id) continue;
    const list = categoriesByStage.get(category.stage_id) ?? [];
    list.push(category);
    categoriesByStage.set(category.stage_id, list);
  }

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

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

  const grandTotal = sumCategories(categories ?? [], quotesByCategory);
  const openCategories = (categories ?? []).filter((c) => c.status !== "bevestigd");

  const { data: materialListItems } = await supabase
    .from("material_list_items")
    .select("*, matched_article:catalog_articles(*, supplier:suppliers(*))")
    .eq("project_id", id)
    .is("stage_id", null)
    .order("created_at", { ascending: true })
    .returns<MaterialListItem[]>();

  const { data: rentalMultiplier } = await supabase.rpc("rental_multiplier", {
    p_days: computeRentalDays(project),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="budget" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totaaloverzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Totaal inkoop</p>
                <p className="text-xl font-semibold">{euro(grandTotal.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Totaal marge</p>
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
                <p className="text-xs text-muted-foreground">Totaal klantprijs</p>
                <p className="text-xl font-semibold">{euro(grandTotal.client)}</p>
              </div>
            </div>
            {(categories ?? []).length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {openCategories.length === 0
                  ? "Alle categorieën zijn bevestigd."
                  : `${openCategories.length} van ${categories?.length} categorieën nog niet bevestigd: ${openCategories
                      .map((c) => `${c.name} (${CATEGORY_STATUS_LABELS[c.status]})`)
                      .join(", ")}`}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Budget klant</p>
                {project.client_budget != null ? (
                  <p className="text-xl font-semibold">
                    {euro(grandTotal.client)} van {euro(project.client_budget)}
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
                  <p className="text-sm text-muted-foreground">Nog geen klantbudget ingesteld.</p>
                )}
              </div>
              <form
                action={updateProjectBudget.bind(null, project.id)}
                className="flex flex-wrap items-end gap-2"
              >
                <div className="space-y-1">
                  <Label htmlFor="client_budget" className="text-xs">
                    Budget klant (&euro;)
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
                    Standaardmarge (%)
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
                  Opslaan
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">Fase 1 — Materiaallijst &amp; begroting</h2>
          <p className="text-sm text-muted-foreground">
            Materiaallijst uploaden en matchen met de catalogus, resulterend in een
            kosteninschatting per categorie. Deze lijst is voor projectbrede materialen — voor
            materiaal per podium, upload de lijst op de betreffende podiumpagina.
          </p>
        </div>

        <MaterialList
          projectId={project.id}
          stageId={null}
          items={materialListItems ?? []}
          suppliers={suppliers ?? []}
          rentalMultiplier={rentalMultiplier ?? 1}
          defaultMarginPercentage={project.default_margin_percentage}
        />

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">Fase 2 — Offertes</h2>
          <p className="text-sm text-muted-foreground">
            Offertes van leveranciers uitvragen en bevestigen, op basis van de begroting hierboven.
          </p>
        </div>

        <RequestQuotesCard
          projectId={project.id}
          categories={categories ?? []}
          stages={stages ?? []}
          suppliers={suppliers ?? []}
        />

        <QuotePdfImport projectId={project.id} stageId={null} suppliers={suppliers ?? []} />

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">Categorieën per podium</h2>
          <p className="text-sm text-muted-foreground">
            Het resultaat van de offertes hierboven: gekozen en aangevraagde offertes per
            categorie.
          </p>
        </div>

        {(stages ?? []).map((stage) => (
          <BudgetGroup
            key={stage.id}
            title={stage.name}
            categories={categoriesByStage.get(stage.id) ?? []}
            quotesByCategory={quotesByCategory}
            suppliers={suppliers ?? []}
            projectId={project.id}
            stageId={stage.id}
          />
        ))}

        <BudgetGroup
          title="Overige kosten (projectbreed)"
          categories={projectWideCategories}
          quotesByCategory={quotesByCategory}
          suppliers={suppliers ?? []}
          projectId={project.id}
          stageId={null}
        />
      </main>
      <Footer />
    </div>
  );
}
