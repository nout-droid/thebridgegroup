"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMaterialListFile } from "@/lib/parse-material-list";
import {
  categoryRevalidationPath,
  findOrCreateCategory,
  findOrCreateQuote,
  quoteRevalidationPath,
} from "@/lib/server/category-helpers";
import { catalogCategoryLabel } from "@/lib/types";
import type { CategoryStatus, MarginType, QuoteStatus } from "@/lib/types";
import { getTeamOwnerId } from "@/lib/server/team";
import { computeRentalDays } from "@/lib/rental-days";

export async function createCategory(
  projectId: string,
  stageId: string | null,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  let countQuery = supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  countQuery = stageId ? countQuery.eq("stage_id", stageId) : countQuery.is("stage_id", null);
  const { count } = await countQuery;

  await supabase.from("categories").insert({
    project_id: projectId,
    stage_id: stageId,
    name,
    sort_order: count ?? 0,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  if (stageId) revalidatePath(`/projects/${projectId}/stages/${stageId}`);
}

export async function updateCategory(projectId: string, categoryId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "concept") as CategoryStatus;
  const marginType = String(formData.get("margin_type") ?? "percentage") as MarginType;
  const marginValue = Number(formData.get("margin_value") ?? 0);
  const manualCostRaw = String(formData.get("manual_cost") ?? "").trim();
  const manualCost = manualCostRaw === "" ? null : Number(manualCostRaw);
  const estimatedKmRaw = String(formData.get("estimated_km") ?? "").trim();
  const estimatedKm = estimatedKmRaw === "" ? null : Number(estimatedKmRaw);

  if (!name) return;

  const supabase = await createClient();
  const path = await categoryRevalidationPath(supabase, projectId, categoryId);
  await supabase
    .from("categories")
    .update({
      name,
      status,
      margin_type: marginType,
      margin_value: marginValue,
      manual_cost: manualCost,
      estimated_km: estimatedKm,
    })
    .eq("id", categoryId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}

export async function deleteCategory(projectId: string, categoryId: string) {
  const supabase = await createClient();
  const path = await categoryRevalidationPath(supabase, projectId, categoryId);
  await supabase.from("categories").delete().eq("id", categoryId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}

export async function createQuote(projectId: string, categoryId: string, formData: FormData) {
  const supplierId = String(formData.get("supplier_id") ?? "");
  const costPrice = Number(formData.get("cost_price") ?? 0);
  let status = String(formData.get("status") ?? "aangevraagd") as QuoteStatus;
  const notes = String(formData.get("notes") ?? "").trim();
  const co2Raw = String(formData.get("co2_kg") ?? "").trim();
  const co2Kg = co2Raw === "" ? null : Number(co2Raw);

  if (!supplierId) return;

  const supabase = await createClient();

  // Eerste (en enige) offerte voor een categorie telt meteen mee in de begroting —
  // pas bij een tweede, concurrerende offerte is een expliciete keuze nodig.
  const { count: existingQuoteCount } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (!existingQuoteCount) {
    status = "gekozen";
  }

  const path = await categoryRevalidationPath(supabase, projectId, categoryId);
  await supabase.from("quotes").insert({
    category_id: categoryId,
    supplier_id: supplierId,
    cost_price: costPrice,
    status,
    notes,
    co2_kg: co2Kg,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}

export async function requestQuotesForCategories(
  projectId: string,
  formData: FormData
) {
  const supplierId = String(formData.get("supplier_id") ?? "");
  const categoryIds = formData.getAll("category_id").map(String).filter(Boolean);
  if (!supplierId || !categoryIds.length) return;

  const supabase = await createClient();

  for (const categoryId of categoryIds) {
    await findOrCreateQuote(supabase, categoryId, supplierId, "");
    const path = await categoryRevalidationPath(supabase, projectId, categoryId);
    revalidatePath(path);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
}

export async function chooseQuote(projectId: string, quoteId: string) {
  const supabase = await createClient();
  const path = await quoteRevalidationPath(supabase, projectId, quoteId);
  await supabase.rpc("choose_quote", { p_quote_id: quoteId });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}

export async function deleteQuote(projectId: string, quoteId: string) {
  const supabase = await createClient();
  const path = await quoteRevalidationPath(supabase, projectId, quoteId);
  await supabase.from("quotes").delete().eq("id", quoteId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}

export async function updateProjectDetails(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const status = String(formData.get("status") ?? "concept");
  const buildStartDate = String(formData.get("build_start_date") ?? "") || null;
  const strikeEndDate = String(formData.get("strike_end_date") ?? "") || null;
  const showStartDate = String(formData.get("show_start_date") ?? "") || null;
  const showEndDate = String(formData.get("show_end_date") ?? "") || null;
  const showTypeRaw = String(formData.get("show_type") ?? "dag");
  const showType = (["dag", "nacht", "beide"] as const).includes(showTypeRaw as "dag" | "nacht" | "beide")
    ? showTypeRaw
    : "dag";

  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({
      name,
      client_name: clientName,
      event_date: eventDate || null,
      status,
      build_start_date: buildStartDate,
      strike_end_date: strikeEndDate,
      show_start_date: showStartDate,
      show_end_date: showEndDate,
      show_type: showType,
    })
    .eq("id", projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function updateProjectBudget(projectId: string, formData: FormData) {
  const clientBudgetRaw = formData.get("client_budget");
  const clientBudget = clientBudgetRaw === null || clientBudgetRaw === "" ? null : Number(clientBudgetRaw);
  const defaultMarginPercentage = Number(formData.get("default_margin_percentage") ?? 20);

  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ client_budget: clientBudget, default_margin_percentage: defaultMarginPercentage })
    .eq("id", projectId);

  revalidatePath(`/projects/${projectId}/budget`);
}

export async function updateEventCode(projectId: string, formData: FormData) {
  const eventCode = String(formData.get("event_code") ?? "").trim().toUpperCase();
  if (!eventCode) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ event_code: eventCode })
    .eq("id", projectId);

  if (error) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        error.code === "23505" ? "Dit Event ID is al in gebruik." : error.message
      )}`
    );
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function setClientPassword(projectId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_client_password", { p_project_id: projectId, p_password: password });

  revalidatePath(`/projects/${projectId}`);
}

function normalizeAliasText(text: string) {
  return text.trim().toLowerCase();
}

async function rememberAlias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawText: string,
  articleId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const ownerId = await getTeamOwnerId(supabase, user.id);

  await supabase.from("article_aliases").upsert(
    { user_id: ownerId, raw_text: normalizeAliasText(rawText), article_id: articleId },
    { onConflict: "user_id,raw_text" }
  );
}

function materialListRevalidatePaths(projectId: string, stageId: string | null) {
  revalidatePath(`/projects/${projectId}/budget`);
  if (stageId) revalidatePath(`/projects/${projectId}/stages/${stageId}`);
}

export async function uploadMaterialList(
  projectId: string,
  stageId: string | null,
  formData: FormData
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const rows = await parseMaterialListFile(file);
  if (!rows.length) return;

  const supabase = await createClient();

  const { data: inserted } = await supabase
    .from("material_list_items")
    .insert(
      rows.map((row) => ({
        project_id: projectId,
        stage_id: stageId,
        raw_description: row.description,
        quantity: row.quantity,
        unit: row.unit,
      }))
    )
    .select("id, raw_description");

  const items = inserted ?? [];
  if (items.length) {
    // Eén alias-lookup + één bulk-RPC i.p.v. twee databasecalls per regel — bij een grote
    // Vectorworks-export scheelt dat tientallen seconden (zelfde aanpak als quote-pdf-actions.ts).
    const normalizedTexts = [...new Set(items.map((item) => normalizeAliasText(item.raw_description)))];
    const { data: aliasRows } = normalizedTexts.length
      ? await supabase
          .from("article_aliases")
          .select("raw_text, article_id")
          .in("raw_text", normalizedTexts)
          .returns<{ raw_text: string; article_id: string }[]>()
      : { data: [] };

    const aliasArticleIds = [...new Set((aliasRows ?? []).map((row) => row.article_id))];
    const { data: aliasPrices } = aliasArticleIds.length
      ? await supabase
          .from("catalog_articles_net")
          .select("id, day_price")
          .in("id", aliasArticleIds)
          .returns<{ id: string; day_price: number }[]>()
      : { data: [] };
    const priceByArticleId = new Map((aliasPrices ?? []).map((row) => [row.id, row.day_price]));

    const aliasByText = new Map<string, { article_id: string; day_price: number }>();
    for (const row of aliasRows ?? []) {
      const day_price = priceByArticleId.get(row.article_id);
      if (day_price != null) aliasByText.set(row.raw_text, { article_id: row.article_id, day_price });
    }

    const unmatchedItems = items.filter(
      (item) => !aliasByText.has(normalizeAliasText(item.raw_description))
    );
    type BulkMatch = { article_id: string; day_price: number };
    const bulkResult = unmatchedItems.length
      ? await supabase.rpc("suggest_catalog_matches_bulk", {
          p_descriptions: unmatchedItems.map((item) => item.raw_description),
        })
      : { data: [] as BulkMatch[] };
    const bulkMatches = (bulkResult.data ?? []) as BulkMatch[];
    const bestByDescription = new Map(
      unmatchedItems.map((item, i) => [item.raw_description, bulkMatches[i]] as const)
    );

    const itemIds: string[] = [];
    const articleIds: string[] = [];
    const prices: number[] = [];
    let inkoopTotal = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const alias = aliasByText.get(normalizeAliasText(item.raw_description));
      const best = alias ?? bestByDescription.get(item.raw_description);
      if (best?.article_id) {
        const price = alias ? alias.day_price : best.day_price;
        itemIds.push(item.id);
        articleIds.push(best.article_id);
        prices.push(price);
        inkoopTotal += price * (rows[i]?.quantity ?? 1);
      }
    }

    if (itemIds.length) {
      await supabase.rpc("update_material_list_matches", {
        p_item_ids: itemIds,
        p_article_ids: articleIds,
        p_prices: prices,
      });
    }

    // Elke export krijgt standaard drie vrij invulbare stelposten (bekabeling, transport,
    // crew) op 10% van de herkende inkoopsom — een startpunt dat de gebruiker net zo makkelijk
    // kan aanpassen als elke andere regel (zie updateMaterialListItem). Niet nogmaals toevoegen
    // als deze scope al stelposten heeft (bv. bij een tweede upload).
    let stelpostQuery = supabase
      .from("material_list_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .ilike("raw_description", "Stelpost %");
    stelpostQuery = stageId ? stelpostQuery.eq("stage_id", stageId) : stelpostQuery.is("stage_id", null);
    const { count: existingStelpostCount } = await stelpostQuery;

    if (!existingStelpostCount && inkoopTotal > 0) {
      const stelpostValue = Math.round(inkoopTotal * 0.1 * 100) / 100;
      await supabase.from("material_list_items").insert(
        ["Stelpost bekabeling", "Stelpost transport", "Stelpost crew"].map((description) => ({
          project_id: projectId,
          stage_id: stageId,
          raw_description: description,
          quantity: 1,
          unit: "stelpost",
          unit_price: stelpostValue,
        }))
      );
    }
  }

  materialListRevalidatePaths(projectId, stageId);
}

export async function updateMaterialListMatch(
  projectId: string,
  stageId: string | null,
  itemId: string,
  articleId: string,
  unitPrice: number
) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("material_list_items")
    .select("raw_description")
    .eq("id", itemId)
    .single();

  await supabase
    .from("material_list_items")
    .update({ matched_article_id: articleId, unit_price: unitPrice })
    .eq("id", itemId);

  if (item) {
    await rememberAlias(supabase, item.raw_description, articleId);
  }

  materialListRevalidatePaths(projectId, stageId);
}

export async function updateMaterialListItem(
  projectId: string,
  stageId: string | null,
  itemId: string,
  matchedArticleId: string | null,
  formData: FormData
) {
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPriceRaw = formData.get("unit_price");
  const unitPrice = unitPriceRaw === null || unitPriceRaw === "" ? null : Number(unitPriceRaw);
  const saveAsDefault = formData.get("save_as_default") === "on";

  const supabase = await createClient();
  await supabase
    .from("material_list_items")
    .update({ quantity, unit_price: unitPrice })
    .eq("id", itemId);

  if (saveAsDefault && matchedArticleId && unitPrice != null) {
    await supabase.from("catalog_articles").update({ day_price: unitPrice }).eq("id", matchedArticleId);
  }

  materialListRevalidatePaths(projectId, stageId);
}

export async function deleteMaterialListItem(projectId: string, stageId: string | null, itemId: string) {
  const supabase = await createClient();
  await supabase.from("material_list_items").delete().eq("id", itemId);
  materialListRevalidatePaths(projectId, stageId);
}

export async function createCatalogArticleAndMatch(
  projectId: string,
  stageId: string | null,
  itemId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const supplierId = String(formData.get("supplier_id") ?? "");
  const category = String(formData.get("category") ?? "");
  const price = Number(formData.get("day_price") ?? 0);
  if (!name || !supplierId || !category) return;

  const supabase = await createClient();
  const { data: article } = await supabase
    .from("catalog_articles")
    .insert({
      supplier_id: supplierId,
      external_code: name,
      name,
      category,
      day_price: price,
      brand: name.split(/\s+/)[0] || null,
    })
    .select("id")
    .single();
  if (!article) return;

  const { data: item } = await supabase
    .from("material_list_items")
    .select("raw_description")
    .eq("id", itemId)
    .single();

  await supabase
    .from("material_list_items")
    .update({ matched_article_id: article.id, unit_price: price })
    .eq("id", itemId);

  if (item) {
    await rememberAlias(supabase, item.raw_description, article.id);
  }

  materialListRevalidatePaths(projectId, stageId);
}

export async function addMaterialListItem(
  projectId: string,
  stageId: string | null,
  articleId: string,
  description: string,
  quantity: number,
  price: number
) {
  if (!description.trim()) return;
  const supabase = await createClient();
  await supabase.from("material_list_items").insert({
    project_id: projectId,
    stage_id: stageId,
    raw_description: description,
    quantity,
    unit: "stuks",
    matched_article_id: articleId,
    unit_price: price,
  });
  materialListRevalidatePaths(projectId, stageId);
}

interface MaterialListGroupRow {
  id: string;
  raw_description: string;
  quantity: number;
  unit_price: number | null;
  matched_article: { category: string; supplier_id: string } | null;
}

export async function pushMaterialListGroupToQuote(
  projectId: string,
  stageId: string | null,
  category: string,
  supplierId: string
) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("build_start_date, strike_end_date")
    .eq("id", projectId)
    .single();

  const { data: multiplier } = await supabase.rpc("rental_multiplier", {
    p_days: computeRentalDays(project ?? { build_start_date: null, strike_end_date: null }),
  });
  const mult = multiplier ?? 1;

  let query = supabase
    .from("material_list_items")
    .select("id, raw_description, quantity, unit_price, matched_article:catalog_articles(category, supplier_id)")
    .eq("project_id", projectId);
  query = stageId ? query.eq("stage_id", stageId) : query.is("stage_id", null);
  const { data: items } = await query.returns<MaterialListGroupRow[]>();

  const groupItems = (items ?? []).filter(
    (item) =>
      item.matched_article?.category === category &&
      item.matched_article?.supplier_id === supplierId &&
      item.unit_price != null
  );

  if (!groupItems.length) return;

  const categoryName = catalogCategoryLabel(category);
  const categoryId = await findOrCreateCategory(supabase, projectId, stageId, categoryName);
  if (!categoryId) return;

  const quoteId = await findOrCreateQuote(
    supabase,
    categoryId,
    supplierId,
    "Automatische indicatie o.b.v. prijslijst"
  );
  if (!quoteId) return;

  await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
  await supabase.from("quote_line_items").insert(
    groupItems.map((item) => ({
      quote_id: quoteId,
      material_list_item_id: item.id,
      description: item.raw_description,
      quantity: item.quantity,
      unit_price: (item.unit_price ?? 0) * mult,
    }))
  );

  materialListRevalidatePaths(projectId, stageId);
}

export async function addQuoteLineItem(projectId: string, quoteId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unit_price") ?? 0);
  if (!description) return;

  const supabase = await createClient();
  const path = await quoteRevalidationPath(supabase, projectId, quoteId);
  await supabase.from("quote_line_items").insert({
    quote_id: quoteId,
    description,
    quantity,
    unit_price: unitPrice,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}

export async function deleteQuoteLineItem(projectId: string, lineItemId: string) {
  const supabase = await createClient();
  const { data: lineItem } = await supabase
    .from("quote_line_items")
    .select("quote_id")
    .eq("id", lineItemId)
    .maybeSingle();

  const path = lineItem?.quote_id
    ? await quoteRevalidationPath(supabase, projectId, lineItem.quote_id)
    : `/projects/${projectId}/budget`;

  await supabase.from("quote_line_items").delete().eq("id", lineItemId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
}
