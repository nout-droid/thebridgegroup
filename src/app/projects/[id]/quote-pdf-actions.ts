"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseQuotePdfFile } from "@/lib/parse-quote-pdf";
import { findOrCreateCategory, findOrCreateQuote } from "@/lib/server/category-helpers";
import { getTeamOwnerId } from "@/lib/server/team";
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

  // Eén regel per keer opzoeken (alias-lookup + evt. RPC) duurt bij 200+ regels tientallen
  // seconden serieel en loopt vast op de timeout — daarom aliassen in één query ophalen en
  // de fuzzy-match RPC voor de rest parallel (met een limiet) i.p.v. na elkaar uitvoeren.
  const normalizedTexts = [...new Set(lines.map((line) => normalizeAliasText(line.raw_text)))];
  const { data: aliasRows } = normalizedTexts.length
    ? await supabase
        .from("article_aliases")
        .select("raw_text, article_id, catalog_articles(name, category)")
        .in("raw_text", normalizedTexts)
        .returns<{
          raw_text: string;
          article_id: string;
          catalog_articles: { name: string; category: string } | null;
        }[]>()
    : { data: [] };

  const aliasByText = new Map((aliasRows ?? []).map((row) => [row.raw_text, row]));

  const unmatchedLines = lines.filter((line) => !aliasByText.has(normalizeAliasText(line.raw_text)));

  // Eén bulk-RPC i.p.v. één RPC-aanroep per regel — bij 200+ regels is dat het verschil tussen
  // 200+ losse netwerk-roundtrips en 1.
  type BulkMatch = { idx: number; article_id: string; name: string; category: string };
  const bulkResult = unmatchedLines.length
    ? await supabase.rpc("suggest_catalog_matches_bulk", {
        p_descriptions: unmatchedLines.map((line) => line.raw_text),
      })
    : { data: [] as BulkMatch[] };
  const bulkMatches = bulkResult.data as BulkMatch[] | null;

  const bestByRawText = new Map(
    (bulkMatches ?? []).map((row, i) => [unmatchedLines[i].raw_text, row])
  );

  return lines.map((line): ParsedQuoteReviewLine => {
    const normalized = normalizeAliasText(line.raw_text);
    const alias = aliasByText.get(normalized);

    if (alias?.catalog_articles) {
      return {
        raw_text: line.raw_text,
        price: line.price,
        matched_article_id: alias.article_id,
        matched_label: alias.catalog_articles.name,
        category: catalogCategoryLabel(alias.catalog_articles.category),
      };
    }

    const best = bestByRawText.get(line.raw_text);

    return {
      raw_text: line.raw_text,
      price: line.price,
      matched_article_id: best?.article_id ?? null,
      matched_label: best?.name ?? null,
      category: best?.category ? catalogCategoryLabel(best.category) : "",
    };
  });
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
    const ownerId = await getTeamOwnerId(supabase, user.id);
    const aliasRows = lines
      .filter((line) => line.matched_article_id)
      .map((line) => ({
        user_id: ownerId,
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
