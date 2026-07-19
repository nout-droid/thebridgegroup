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

  if (!name) return;

  const supabase = await createClient();
  const path = await categoryRevalidationPath(supabase, projectId, categoryId);
  await supabase
    .from("categories")
    .update({ name, status, margin_type: marginType, margin_value: marginValue })
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
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(path);
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

interface AliasMatch {
  article_id: string;
  day_price: number;
}

async function findAliasMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawText: string
): Promise<AliasMatch | null> {
  const { data: alias } = await supabase
    .from("article_aliases")
    .select("article_id")
    .eq("raw_text", normalizeAliasText(rawText))
    .maybeSingle();

  if (!alias) return null;

  const { data: article } = await supabase
    .from("catalog_articles_net")
    .select("day_price")
    .eq("id", alias.article_id)
    .maybeSingle();

  return article ? { article_id: alias.article_id, day_price: article.day_price } : null;
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

export async function uploadMaterialList(projectId: string, formData: FormData) {
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
        raw_description: row.description,
        quantity: row.quantity,
        unit: row.unit,
      }))
    )
    .select("id, raw_description");

  for (const item of inserted ?? []) {
    const alias = await findAliasMatch(supabase, item.raw_description);
    if (alias) {
      await supabase
        .from("material_list_items")
        .update({
          matched_article_id: alias.article_id,
          unit_price: alias.day_price,
        })
        .eq("id", item.id);
      continue;
    }

    const { data: suggestions } = await supabase.rpc("suggest_catalog_matches", {
      p_description: item.raw_description,
      p_limit: 1,
    });
    const best = suggestions?.[0];
    if (best) {
      await supabase
        .from("material_list_items")
        .update({ matched_article_id: best.article_id, unit_price: best.day_price })
        .eq("id", item.id);
    }
  }

  revalidatePath(`/projects/${projectId}/budget`);
}

export async function updateMaterialListMatch(
  projectId: string,
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

  revalidatePath(`/projects/${projectId}/budget`);
}

export async function updateMaterialListItem(projectId: string, itemId: string, formData: FormData) {
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = formData.get("unit_price");

  const supabase = await createClient();
  await supabase
    .from("material_list_items")
    .update({
      quantity,
      unit_price: unitPrice === null || unitPrice === "" ? null : Number(unitPrice),
    })
    .eq("id", itemId);

  revalidatePath(`/projects/${projectId}/budget`);
}

export async function deleteMaterialListItem(projectId: string, itemId: string) {
  const supabase = await createClient();
  await supabase.from("material_list_items").delete().eq("id", itemId);
  revalidatePath(`/projects/${projectId}/budget`);
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

  const { data: items } = await supabase
    .from("material_list_items")
    .select("id, raw_description, quantity, unit_price, matched_article:catalog_articles(category, supplier_id)")
    .eq("project_id", projectId)
    .returns<MaterialListGroupRow[]>();

  const groupItems = (items ?? []).filter(
    (item) =>
      item.matched_article?.category === category &&
      item.matched_article?.supplier_id === supplierId &&
      item.unit_price != null
  );

  if (!groupItems.length) return;

  const categoryName = catalogCategoryLabel(category);
  const categoryId = await findOrCreateCategory(supabase, projectId, null, categoryName);
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

  revalidatePath(`/projects/${projectId}/budget`);
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
