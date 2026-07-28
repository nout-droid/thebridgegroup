import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdf, type InvoicePdfGroup } from "@/lib/generate-invoice-pdf";
import { getOrgBranding } from "@/lib/server/organization";
import { computeClientPrice, type Category, type Quote, type Stage } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name, event_date, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  // Deze queries hebben alleen `id` nodig (geen onderlinge afhankelijkheid) — in één keer
  // parallel opvragen i.p.v. na elkaar, zelfde patroon als src/app/projects/[id]/budget/page.tsx.
  const [{ data: stages }, { data: categories }, branding] = await Promise.all([
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
    getOrgBranding(project.user_id),
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

  const pdfBuffer = await generateInvoicePdf(
    {
      projectName: project.name,
      clientName: project.client_name || null,
      eventDate: project.event_date,
      generatedAt: new Date(),
      groups,
      totalClientPrice,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="offerte-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
