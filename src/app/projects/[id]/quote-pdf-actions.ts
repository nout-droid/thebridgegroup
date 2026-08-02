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
  heading: string | null;
  stage_id: string | null;
  stage_name: string | null;
}

function normalizeAliasText(text: string) {
  return text.trim().toLowerCase();
}

// Simpele, tolerante match: een kop van de leverancier ("Licht area 1") wordt aan een podium
// gekoppeld zodra de podiumnaam er (case-insensitive) in voorkomt, of andersom. Geen fuzzy
// matching nodig voor dit soort korte namen — bij twijfel blijft de regel ongekoppeld en kan
// de gebruiker het per regel handmatig zetten.
function matchHeadingToStage(
  heading: string,
  stages: { id: string; name: string }[]
): { id: string; name: string } | null {
  const normalized = heading.toLowerCase();
  for (const stage of stages) {
    const stageName = stage.name.toLowerCase();
    if (normalized.includes(stageName) || stageName.includes(normalized)) return stage;
  }
  return null;
}

export async function parseQuotePdf(
  projectId: string,
  formData: FormData
): Promise<ParsedQuoteReviewLine[]> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return [];

  const lines = await parseQuotePdfFile(file);
  if (!lines.length) return [];

  const supabase = await createClient();

  // Eén regel per keer opzoeken (alias-lookup + evt. RPC) duurt bij 200+ regels tientallen
  // seconden serieel en loopt vast op de timeout — daarom aliassen in één query ophalen en
  // de fuzzy-match RPC voor de rest parallel (met een limiet) i.p.v. na elkaar uitvoeren.
  const normalizedTexts = [...new Set(lines.map((line) => normalizeAliasText(line.raw_text)))];
  const [{ data: aliasRows }, { data: categoryAliasRows }, { data: stages }, { data: projectCategories }] = await Promise.all([
    normalizedTexts.length
      ? supabase
          .from("article_aliases")
          .select("raw_text, article_id, catalog_articles(name, category)")
          .in("raw_text", normalizedTexts)
          .returns<{
            raw_text: string;
            article_id: string;
            catalog_articles: { name: string; category: string } | null;
          }[]>()
      : { data: [] },
    // Los van de catalogus-koppeling hierboven: leert raw_text -> categorie ook voor regels
    // die nooit een catalogusartikel matchen (stelposten, subcomponenten, accessoires).
    normalizedTexts.length
      ? supabase
          .from("quote_line_category_aliases")
          .select("raw_text, category")
          .in("raw_text", normalizedTexts)
          .returns<{ raw_text: string; category: string }[]>()
      : { data: [] },
    supabase
      .from("stages")
      .select("id, name")
      .eq("project_id", projectId)
      .returns<{ id: string; name: string }[]>(),
    supabase
      .from("categories")
      .select("name, stage_id")
      .eq("project_id", projectId)
      .returns<{ name: string; stage_id: string | null }[]>(),
  ]);

  const aliasByText = new Map((aliasRows ?? []).map((row) => [row.raw_text, row]));
  const categoryAliasByText = new Map((categoryAliasRows ?? []).map((row) => [row.raw_text, row.category]));

  // Als een categorienaam in dit project altijd bij hetzelfde (niet-projectbrede) podium
  // hoort — bv. "Sound" bestaat alleen onder "Zaal" — dan is dat podium een betrouwbare
  // gok zodra de categorie zelf matcht, ook als de kop van de leverancier ("Sound") geen
  // podiumnaam bevat. Komt de naam bij meerdere podia (of ook projectbreed) voor, dan is
  // het ambigu en blijft het aan de gebruiker.
  const stageIdByCategoryName = new Map<string, string | null>();
  const ambiguousCategoryNames = new Set<string>();
  for (const cat of projectCategories ?? []) {
    const key = cat.name.trim().toLowerCase();
    if (!stageIdByCategoryName.has(key)) {
      stageIdByCategoryName.set(key, cat.stage_id);
    } else if (stageIdByCategoryName.get(key) !== cat.stage_id) {
      ambiguousCategoryNames.add(key);
    }
  }
  const stageById = new Map((stages ?? []).map((s) => [s.id, s]));
  function inferStageFromCategory(category: string): { id: string; name: string } | null {
    const key = category.trim().toLowerCase();
    if (!key || ambiguousCategoryNames.has(key)) return null;
    const stageId = stageIdByCategoryName.get(key);
    return stageId ? (stageById.get(stageId) ?? null) : null;
  }

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

  // Elke unieke kop maar één keer tegen de podiumlijst afzetten i.p.v. per regel opnieuw.
  const stageByHeading = new Map<string, { id: string; name: string } | null>();
  for (const heading of new Set(
    lines.map((l) => l.heading).filter((h): h is string => Boolean(h))
  )) {
    stageByHeading.set(heading, matchHeadingToStage(heading, stages ?? []));
  }

  return lines.map((line): ParsedQuoteReviewLine => {
    const normalized = normalizeAliasText(line.raw_text);
    const alias = aliasByText.get(normalized);
    const matchedStage = line.heading ? (stageByHeading.get(line.heading) ?? null) : null;

    if (alias?.catalog_articles) {
      const category = catalogCategoryLabel(alias.catalog_articles.category);
      const stage = matchedStage ?? inferStageFromCategory(category);
      return {
        raw_text: line.raw_text,
        price: line.price,
        matched_article_id: alias.article_id,
        matched_label: alias.catalog_articles.name,
        category,
        heading: line.heading,
        stage_id: stage?.id ?? null,
        stage_name: stage?.name ?? null,
      };
    }

    const best = bestByRawText.get(line.raw_text);
    // Eerder handmatig gekozen categorie voor exact deze omschrijving wint van een fuzzy
    // catalogus-gok — de gebruiker heeft dit al eens bevestigd.
    const learnedCategory = categoryAliasByText.get(normalized);
    const category = learnedCategory ?? (best?.category ? catalogCategoryLabel(best.category) : "");
    // Kop-gebaseerde match wint (direct signaal uit de PDF zelf); anders proberen we het
    // podium af te leiden uit de categorie zoals die al in dit project is ingericht.
    const stage = matchedStage ?? inferStageFromCategory(category);

    return {
      raw_text: line.raw_text,
      price: line.price,
      matched_article_id: best?.article_id ?? null,
      matched_label: best?.name ?? null,
      category,
      heading: line.heading,
      stage_id: stage?.id ?? null,
      stage_name: stage?.name ?? null,
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

  // Een nieuwe PDF voor dezelfde (categorie, leverancier) is een herziene offerte, geen
  // aanvulling — anders telt cost_price straks de oude én de nieuwe regels bij elkaar op.
  await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
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

    // Ook zonder catalogus-match: elke bevestigde regel leert dat deze exacte omschrijving
    // bij deze categorie hoort, zodat een volgende offerte met dezelfde regel niet opnieuw
    // handmatig gecategoriseerd hoeft te worden.
    const categoryAliasRows = lines.map((line) => ({
      user_id: ownerId,
      raw_text: normalizeAliasText(line.raw_text),
      category: category.trim(),
      updated_at: new Date().toISOString(),
    }));
    await supabase
      .from("quote_line_category_aliases")
      .upsert(categoryAliasRows, { onConflict: "user_id,raw_text" });
  }

  const matchedLines = lines.filter((line) => line.matched_article_id);
  if (matchedLines.length) {
    await supabase.rpc("update_catalog_last_seen_prices", {
      p_article_ids: matchedLines.map((line) => line.matched_article_id as string),
      p_prices: matchedLines.map((line) => line.price),
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(
    stageId ? `/projects/${projectId}/stages/${stageId}` : `/projects/${projectId}/budget`
  );
}
