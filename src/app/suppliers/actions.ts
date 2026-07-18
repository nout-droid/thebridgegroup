"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";

export async function createSupplier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const specialties = String(formData.get("specialties") ?? "").trim();
  const discount = Number(formData.get("default_discount_percentage") ?? 0);

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  await supabase.from("suppliers").insert({
    user_id: ownerId,
    name,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    specialties,
    default_discount_percentage: discount,
  });

  revalidatePath("/suppliers");
}

export async function updateSupplierDiscount(supplierId: string, formData: FormData) {
  const discount = Number(formData.get("default_discount_percentage") ?? 0);

  const supabase = await createClient();
  await supabase
    .from("suppliers")
    .update({ default_discount_percentage: discount })
    .eq("id", supplierId);

  revalidatePath("/suppliers");
}

export async function deleteSupplier(supplierId: string) {
  const supabase = await createClient();
  await supabase.from("suppliers").delete().eq("id", supplierId);
  revalidatePath("/suppliers");
}

export async function updateSupplierPortalCode(supplierId: string, formData: FormData) {
  const portalCode = String(formData.get("portal_code") ?? "")
    .trim()
    .toUpperCase();
  if (!portalCode) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ portal_code: portalCode })
    .eq("id", supplierId);

  if (error) {
    redirect(
      `/suppliers?error=${encodeURIComponent(
        error.code === "23505" ? "Deze leverancierscode is al in gebruik." : error.message
      )}`
    );
  }

  revalidatePath("/suppliers");
}

export async function setSupplierPassword(supplierId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_supplier_password", {
    p_supplier_id: supplierId,
    p_password: password,
  });

  revalidatePath("/suppliers");
}

const HEADER_ALIASES: Record<string, string> = {
  code: "external_code",
  external_code: "external_code",
  artikelcode: "external_code",
  name: "name",
  naam: "name",
  description: "name",
  omschrijving: "name",
  category: "category",
  categorie: "category",
  properties: "properties",
  eigenschappen: "properties",
  day_price: "day_price",
  dagprijs: "day_price",
  price: "day_price",
  prijs: "day_price",
};

function parsePrice(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let normalized = trimmed;
  if (hasComma && hasDot) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export async function uploadCatalog(supplierId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data
    .map((row) => {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const alias = HEADER_ALIASES[key.trim().toLowerCase()];
        if (alias) mapped[alias] = value ?? "";
      }
      return mapped;
    })
    .filter((row) => row.name)
    .map((row) => ({
      supplier_id: supplierId,
      external_code: row.external_code?.trim() || row.name,
      name: row.name,
      category: row.category ?? "",
      properties: row.properties ?? "",
      day_price: parsePrice(row.day_price ?? "0"),
    }));

  const dedupedRows = Array.from(
    new Map(rows.map((row) => [row.external_code, row])).values()
  );

  if (!dedupedRows.length) {
    redirect(
      `/suppliers?error=${encodeURIComponent(
        "Geen bruikbare rijen gevonden. Verwacht kolommen: code, name, category, properties, day_price."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_articles")
    .upsert(dedupedRows, { onConflict: "supplier_id,external_code" });

  if (error) {
    redirect(`/suppliers?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/suppliers");
}
