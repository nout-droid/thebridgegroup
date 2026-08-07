import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Organization } from "../types";
import { buildInvoiceGroups } from "./invoice-data";

// Zelfde patroon als de Stripe-scaffold (src/lib/stripe.ts): code + schema staan nu klaar,
// maar blijven inert totdat de gebruiker zelf zijn Moneybird-administratie + access token
// invult bij Instellingen. Per organisatie een eigen koppeling (geen globale env var) — elke
// klant op dit SaaS-platform heeft immers zijn eigen Moneybird-boekhouding.
export function isMoneybirdConfigured(
  org: Pick<Organization, "moneybird_administration_id" | "moneybird_access_token"> | null | undefined
): boolean {
  return Boolean(org?.moneybird_administration_id && org?.moneybird_access_token);
}

async function moneybirdRequest<T>(
  org: Pick<Organization, "moneybird_administration_id" | "moneybird_access_token">,
  path: string,
  init?: RequestInit
): Promise<T | null> {
  if (!isMoneybirdConfigured(org)) return null;
  try {
    const res = await fetch(
      `https://moneybird.com/api/v2/${org.moneybird_administration_id}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${org.moneybird_access_token}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Verifieert de opgeslagen credentials met een lichte GET (het eigen administratie-profiel) —
// gebruikt door de "Verbinding testen"-knop bij Instellingen, zonder meteen iets aan te maken.
export async function testMoneybirdConnection(
  org: Pick<Organization, "moneybird_administration_id" | "moneybird_access_token">
): Promise<boolean> {
  const result = await moneybirdRequest<{ id: string }>(org, ".json");
  return Boolean(result?.id);
}

interface MoneybirdContact {
  id: string;
}

async function findOrCreateContact(
  org: Pick<Organization, "moneybird_administration_id" | "moneybird_access_token">,
  clientName: string
): Promise<string | null> {
  const existing = await moneybirdRequest<MoneybirdContact[]>(
    org,
    `/contacts.json?query=${encodeURIComponent(clientName)}`
  );
  if (existing?.[0]?.id) return existing[0].id;

  const created = await moneybirdRequest<MoneybirdContact>(org, "/contacts.json", {
    method: "POST",
    body: JSON.stringify({ contact: { company_name: clientName } }),
  });
  return created?.id ?? null;
}

// Zet de al bestaande factuur-berekening (dezelfde die de factuur-PDF vult, zie
// src/lib/server/invoice-data.ts) om naar een Moneybird sales_invoice, één regel per
// categorie/podium-groep — geen losse line_items, dat zou de boekhouding onnodig
// gedetailleerd maken voor wat in Moneybird gewoon "verkoop event X" is.
export async function pushInvoiceToMoneybird(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  org: Pick<Organization, "moneybird_administration_id" | "moneybird_access_token">,
  project: { id: string; name: string; client_name: string; invoice_number: string | null }
): Promise<{ success: boolean; invoiceId: string | null }> {
  if (!isMoneybirdConfigured(org)) return { success: false, invoiceId: null };

  const contactId = await findOrCreateContact(org, project.client_name || project.name);
  if (!contactId) return { success: false, invoiceId: null };

  const { groups } = await buildInvoiceGroups(supabase, project.id);
  const details = groups.flatMap((group) =>
    group.lines.map((line) => ({
      description: group.stageName ? `[${group.stageName}] ${line.categoryName}` : line.categoryName,
      price: line.clientPrice,
      amount: "1",
    }))
  );

  if (!details.length) return { success: false, invoiceId: null };

  const created = await moneybirdRequest<{ id: string }>(org, "/sales_invoices.json", {
    method: "POST",
    body: JSON.stringify({
      sales_invoice: {
        contact_id: contactId,
        reference: project.invoice_number ?? project.name,
        details,
      },
    }),
  });

  return { success: Boolean(created?.id), invoiceId: created?.id ?? null };
}
