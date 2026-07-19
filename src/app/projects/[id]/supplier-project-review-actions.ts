"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseQuotePdfFile } from "@/lib/parse-quote-pdf";
import { getTeamOwnerId } from "@/lib/server/team";
import { catalogCategoryLabel } from "@/lib/types";

export interface SupplierDocumentCategoryOption {
  id: string;
  name: string;
}

export interface ParsedSupplierDocumentLine {
  raw_text: string;
  price: number;
  matched_article_id: string | null;
  matched_label: string | null;
  suggested_category_id: string | null;
}

export interface ParsedSupplierDocument {
  lines: ParsedSupplierDocumentLine[];
  categories: SupplierDocumentCategoryOption[];
}

function normalizeAliasText(text: string) {
  return text.trim().toLowerCase();
}

export async function parseSupplierProjectDocument(
  documentId: string
): Promise<ParsedSupplierDocument> {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("quote_documents")
    .select("storage_path, original_filename, project_id, supplier_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!document || !document.project_id || !document.supplier_id) return { lines: [], categories: [] };

  const { data: invited } = await supabase
    .from("quotes")
    .select("category_id, category:categories(id, name, project_id)")
    .eq("supplier_id", document.supplier_id)
    .returns<{ category_id: string; category: { id: string; name: string; project_id: string } | null }[]>();

  const categories: SupplierDocumentCategoryOption[] = (invited ?? [])
    .filter((row) => row.category?.project_id === document.project_id)
    .map((row) => ({ id: row.category!.id, name: row.category!.name }));
  if (!categories.length) return { lines: [], categories: [] };

  const { data: blob, error } = await supabase.storage
    .from("portal-documents")
    .download(document.storage_path);
  if (error || !blob) return { lines: [], categories };

  const file = new File([blob], document.original_filename || "document.pdf", {
    type: "application/pdf",
  });
  const rawLines = await parseQuotePdfFile(file);
  if (!rawLines.length) return { lines: [], categories };

  // Eén regel per keer opzoeken (alias-lookup + evt. RPC) duurt bij 200+ regels tientallen
  // seconden serieel en loopt vast op de timeout — daarom aliassen in één query ophalen en
  // de fuzzy-match RPC voor de rest parallel (met een limiet) i.p.v. na elkaar uitvoeren.
  const normalizedTexts = [...new Set(rawLines.map((line) => normalizeAliasText(line.raw_text)))];
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

  const unmatchedLines = rawLines.filter((line) => !aliasByText.has(normalizeAliasText(line.raw_text)));

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

  const lines = rawLines.map((line): ParsedSupplierDocumentLine => {
    const normalized = normalizeAliasText(line.raw_text);
    const alias = aliasByText.get(normalized);

    let matchedArticleId: string | null = null;
    let matchedLabel: string | null = null;
    let catalogLabel = "";

    if (alias?.catalog_articles) {
      matchedArticleId = alias.article_id;
      matchedLabel = alias.catalog_articles.name;
      catalogLabel = catalogCategoryLabel(alias.catalog_articles.category);
    } else {
      const best = bestByRawText.get(line.raw_text);
      matchedArticleId = best?.article_id ?? null;
      matchedLabel = best?.name ?? null;
      catalogLabel = best?.category ? catalogCategoryLabel(best.category) : "";
    }

    const suggestedCategory = catalogLabel
      ? categories.find((c) => c.name.toLowerCase() === catalogLabel.toLowerCase())
      : undefined;

    return {
      raw_text: line.raw_text,
      price: line.price,
      matched_article_id: matchedArticleId,
      matched_label: matchedLabel,
      suggested_category_id: suggestedCategory?.id ?? null,
    };
  });

  return { lines, categories };
}

export async function confirmSupplierProjectDocument(
  projectId: string,
  documentId: string,
  supplierId: string,
  lines: { raw_text: string; price: number; matched_article_id: string | null; category_id: string }[]
) {
  const supabase = await createClient();

  const assigned = lines.filter((line) => line.category_id);
  const byCategoryId = new Map<string, typeof assigned>();
  for (const line of assigned) {
    const list = byCategoryId.get(line.category_id) ?? [];
    list.push(line);
    byCategoryId.set(line.category_id, list);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = user ? await getTeamOwnerId(supabase, user.id) : null;

  for (const [categoryId, groupLines] of byCategoryId) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("category_id", categoryId)
      .eq("supplier_id", supplierId)
      .maybeSingle();
    if (!quote) continue;

    await supabase.from("quote_line_items").insert(
      groupLines.map((line) => ({
        quote_id: quote.id,
        catalog_article_id: line.matched_article_id,
        description: line.raw_text,
        quantity: 1,
        unit_price: line.price,
      }))
    );

    if (ownerId) {
      const aliasRows = groupLines
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
  }

  await supabase
    .from("quote_documents")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", documentId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
}

export async function dismissSupplierProjectDocument(projectId: string, documentId: string) {
  const supabase = await createClient();
  await supabase
    .from("quote_documents")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", documentId);

  revalidatePath(`/projects/${projectId}`);
}
