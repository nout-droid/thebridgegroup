import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category, MaterialListItem, Quote, Supplier } from "@/lib/types";
import { CategoryCard } from "../category-card";
import { AddCategoryForm } from "../add-category-form";
import { MaterialList } from "../material-list";
import { QuotePdfImport } from "../quote-pdf-import";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

  const projectWideCategories = (categories ?? []).filter((c) => !c.stage_id);

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  const categoryIds = projectWideCategories.map((c) => c.id);
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

  const { data: materialListItems } = await supabase
    .from("material_list_items")
    .select("*, matched_article:catalog_articles(*, supplier:suppliers(*))")
    .eq("project_id", id)
    .order("created_at", { ascending: true })
    .returns<MaterialListItem[]>();

  const { data: rentalMultiplier } = await supabase.rpc("rental_multiplier", {
    p_days: project.rental_days,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="budget" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div className="space-y-4">
          {projectWideCategories.map((category) => (
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
            <CardTitle className="text-base">Projectbrede categorie toevoegen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Voor kosten die niet aan één stage hangen, bv. transport, crew of hotel.
            </p>
          </CardHeader>
          <CardContent>
            <AddCategoryForm projectId={project.id} />
          </CardContent>
        </Card>

        <MaterialList
          projectId={project.id}
          items={materialListItems ?? []}
          rentalMultiplier={rentalMultiplier ?? 1}
        />

        <QuotePdfImport projectId={project.id} stageId={null} suppliers={suppliers ?? []} />
      </main>
      <Footer />
    </div>
  );
}
