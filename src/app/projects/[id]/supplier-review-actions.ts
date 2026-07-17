"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseQuotePdfFile } from "@/lib/parse-quote-pdf";
import { quoteRevalidationPath } from "@/lib/server/category-helpers";

export interface PendingDocumentLine {
  raw_text: string;
  price: number;
}

export async function parseStoredQuoteDocument(documentId: string): Promise<PendingDocumentLine[]> {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("quote_documents")
    .select("storage_path, original_filename")
    .eq("id", documentId)
    .maybeSingle();
  if (!document) return [];

  const { data: blob, error } = await supabase.storage
    .from("portal-documents")
    .download(document.storage_path);
  if (error || !blob) return [];

  const file = new File([blob], document.original_filename || "document.pdf", {
    type: "application/pdf",
  });

  return parseQuotePdfFile(file);
}

export async function confirmSupplierDocument(
  projectId: string,
  documentId: string,
  quoteId: string,
  lines: PendingDocumentLine[]
) {
  const supabase = await createClient();
  const path = await quoteRevalidationPath(supabase, projectId, quoteId);

  await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
  if (lines.length) {
    await supabase.from("quote_line_items").insert(
      lines.map((line) => ({
        quote_id: quoteId,
        description: line.raw_text,
        quantity: 1,
        unit_price: line.price,
      }))
    );
  }

  await supabase
    .from("quote_documents")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", documentId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(path);
}

export async function dismissSupplierDocument(projectId: string, documentId: string) {
  const supabase = await createClient();
  await supabase
    .from("quote_documents")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", documentId);

  revalidatePath(`/projects/${projectId}`);
}
