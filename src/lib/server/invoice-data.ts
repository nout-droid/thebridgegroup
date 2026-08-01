import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoicePdfGroup } from "../generate-invoice-pdf";
import { computeClientPrice, type Category, type Quote, type Stage } from "../types";

// Gedeeld tussen de factuur- en offerte-PDF-route (src/app/projects/[id]/budget/invoice en
// .../quote) — beide tonen exact dezelfde regels/bedragen, alleen het document eromheen
// verschilt (nummering, label). Niet dupliceren tussen de twee route.ts-bestanden.
export async function buildInvoiceGroups(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  projectId: string
): Promise<{ groups: InvoicePdfGroup[]; totalClientPrice: number }> {
  const [{ data: stages }, { data: categories }] = await Promise.all([
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    supabase
      .from("categories")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .returns<Category[]>(),
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

  function clientPriceFor(category: Category): number | null {
    const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
    const cost = chosen?.cost_price ?? category.manual_cost;
    if (cost === null || cost === undefined) return null;
    return computeClientPrice(category, cost);
  }

  const projectWideCategories = (categories ?? []).filter((c) => !c.stage_id);
  const categoriesByStage = new Map<string, Category[]>();
  for (const category of categories ?? []) {
    if (!category.stage_id) continue;
    const list = categoriesByStage.get(category.stage_id) ?? [];
    list.push(category);
    categoriesByStage.set(category.stage_id, list);
  }

  let totalClientPrice = 0;
  const toLines = (cats: Category[]) =>
    cats.flatMap((category) => {
      const price = clientPriceFor(category);
      if (price === null) return [];
      totalClientPrice += price;
      return [{ categoryName: category.name, clientPrice: price }];
    });

  const groups: InvoicePdfGroup[] = [
    ...(stages ?? []).map((stage) => ({
      stageName: stage.name,
      lines: toLines(categoriesByStage.get(stage.id) ?? []),
    })),
    {
      stageName: null,
      lines: toLines(projectWideCategories),
    },
  ];

  return { groups, totalClientPrice };
}
