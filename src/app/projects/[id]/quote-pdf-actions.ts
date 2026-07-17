"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseQuotePdfFile } from "@/lib/parse-quote-pdf";
import { findOrCreateCategory, findOrCreateQuote } from "@/lib/server/category-helpers";
import { catalogCategoryLabel } from "@/lib/types";

export interface ParsedQuoteReviewLine {
  raw_text: string;
  price: number;
  matched_article_id: string | null;
  matched_label: string | null;
  category: string;
}

function normalizeAliasText(text: string) {
  return text.trim().toLowerCase();
}

export async function parseQuotePdf(formData: FormData): Promise<ParsedQuoteReviewLine[]> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return [];

  const lines = await parseQuotePdfFile(file);
  if (!lines.length) return [];

  const supabase = await createClient();
  const results: ParsedQuoteReviewLine[] = [];

  for (const line of lines) {
    const normalized = normalizeAliasText(line.raw_text);

    const { data: alias } = await supabase
      .from("article_aliases")
      .select("article_id, catalog_articles(name, category)")
      .eq("raw_text", normalized)
      .maybeSingle<{
        article_id: string;
        catalog_articles: { name: string; category: string } | null;
      }>();

    if (alias?.catalog_articles) {
      results.push({
        raw_text: line.raw_text,
        price: line.price,
        matched_article_id: alias.article_id,
        matched_label: alias.catalog_articles.name,
        category: catalogCategoryLabel(alias.catalog_articles.category),
      });
      continue;
    }

    const { data: suggestions } = await supabase.rpc("suggest_catalog_matches", {
      p_description: line.raw_text,
      p_limit: 1,
    });
    const best = suggestions?.[0];

    results.push({
      raw_text: line.raw_text,
      price: line.price,
      matched_article_id: best?.article_id ?? null,
      matched_label: best?.name ?? null,
      category: best ? catalogCategoryLabel(best.category) : "",
    });
  }

  return results;
}

export async function confirmQuotePdfImportGroup(
  projectId: string,
  stageId: string | null,
  category: string,
  supplierId: string,
  lines: { raw_text: string; price: number; matched_article_id: string | null }[]
) {
  if (!category.trim() || !lines.length) return;

  const supabase = await createClient();

  const categoryId = await findOrCreateCategory(supabase, projectId, stageId, category.trim());
  if (!categoryId) return;

  const quoteId = await findOrCreateQuote(
    supabase,
    categoryId,
    supplierId,
    "Geïmporteerd uit offerte-PDF"
  );
  if (!quoteId) return;

  await supabase.from("quote_line_items").insert(
    lines.map((line) => ({
      quote_id: quoteId,
      catalog_article_id: line.matched_article_id,
      description: line.raw_text,
      quantity: 1,
      unit_price: line.price,
    }))
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const aliasRows = lines
      .filter((line) => line.matched_article_id)
      .map((line) => ({
        user_id: user.id,
        raw_text: normalizeAliasText(line.raw_text),
        article_id: line.matched_article_id as string,
      }));

    if (aliasRows.length) {
      await supabase.from("article_aliases").upsert(aliasRows, { onConflict: "user_id,raw_text" });
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(
    stageId ? `/projects/${projectId}/stages/${stageId}` : `/projects/${projectId}/budget`
  );
}
