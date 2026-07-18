import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound, getStageOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { computeClientPrice, type Category, type Quote, type Supplier } from "@/lib/types";
import { CategoryCard } from "../../category-card";
import { AddCategoryForm } from "../../add-category-form";
import { QuotePdfImport } from "../../quote-pdf-import";
import { updateStage, deleteStage } from "../actions";
import { StageSubNav } from "./stage-sub-nav";

export default async function StagePage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);
  const stage = await getStageOrNotFound(supabase, id, stageId);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("stage_id", stageId)
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

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

  const subtotal = (categories ?? []).reduce((sum, category) => {
    const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
    return chosen ? sum + computeClientPrice(category, chosen.cost_price) : sum;
  }, 0);

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
            <CardTitle>Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <form
                action={updateStage.bind(null, project.id, stage.id)}
                className="flex flex-1 items-end gap-2"
              >
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="name">Naam</Label>
                  <Input id="name" name="name" defaultValue={stage.name} required />
                </div>
                <Button type="submit" size="sm">
                  Opslaan
                </Button>
              </form>
              <form action={deleteStage.bind(null, project.id, stage.id)}>
                <Button type="submit" size="sm" variant="ghost">
                  Stage verwijderen
                </Button>
              </form>
            </div>

            <p className="text-lg">
              Subtotaal (klant): <span className="font-semibold">&euro; {subtotal.toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(categories ?? []).map((category) => (
            <CategoryCard
              key={category.id}
              projectId={project.id}
              category={category}
              quotes={quotesByCategory.get(category.id) ?? []}
              suppliers={suppliers ?? []}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorie toevoegen</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCategoryForm projectId={project.id} stageId={stage.id} />
          </CardContent>
        </Card>

        <QuotePdfImport projectId={project.id} stageId={stage.id} suppliers={suppliers ?? []} />
      </main>
      <Footer />
    </div>
  );
}
