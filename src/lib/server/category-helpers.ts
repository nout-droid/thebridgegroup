import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function findOrCreateCategory(
  supabase: SupabaseServerClient,
  projectId: string,
  stageId: string | null,
  name: string
): Promise<string | undefined> {
  let query = supabase
    .from("categories")
    .select("id")
    .eq("project_id", projectId)
    .eq("name", name);
  query = stageId ? query.eq("stage_id", stageId) : query.is("stage_id", null);

  const { data: existing } = await query.maybeSingle();
  if (existing?.id) return existing.id;

  let countQuery = supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  countQuery = stageId ? countQuery.eq("stage_id", stageId) : countQuery.is("stage_id", null);
  const { count } = await countQuery;

  const { data: created } = await supabase
    .from("categories")
    .insert({ project_id: projectId, stage_id: stageId, name, sort_order: count ?? 0 })
    .select("id")
    .single();

  return created?.id;
}

export async function categoryRevalidationPath(
  supabase: SupabaseServerClient,
  projectId: string,
  categoryId: string
): Promise<string> {
  const { data: category } = await supabase
    .from("categories")
    .select("stage_id")
    .eq("id", categoryId)
    .maybeSingle();

  return category?.stage_id
    ? `/projects/${projectId}/stages/${category.stage_id}`
    : `/projects/${projectId}/budget`;
}

export async function quoteRevalidationPath(
  supabase: SupabaseServerClient,
  projectId: string,
  quoteId: string
): Promise<string> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("category_id")
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote?.category_id) return `/projects/${projectId}/budget`;
  return categoryRevalidationPath(supabase, projectId, quote.category_id);
}

export async function findOrCreateQuote(
  supabase: SupabaseServerClient,
  categoryId: string,
  supplierId: string,
  notes: string
): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from("quotes")
    .select("id")
    .eq("category_id", categoryId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Eerste (en enige) offerte voor een categorie telt meteen mee in de begroting —
  // pas bij een tweede, concurrerende offerte is een expliciete keuze nodig.
  const { count: existingQuoteCount } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { data: created } = await supabase
    .from("quotes")
    .insert({
      category_id: categoryId,
      supplier_id: supplierId,
      cost_price: 0,
      status: existingQuoteCount ? "aangevraagd" : "gekozen",
      notes,
    })
    .select("id")
    .single();

  return created?.id;
}
