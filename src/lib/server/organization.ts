import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ORGANIZATION_NAME = "The Bridge Group B.V.";
export const DEFAULT_LOGO_URL = "/logo.png";
export const DEFAULT_BRAND_COLOR = "#7CFC6E";

export interface OrgBranding {
  name: string;
  logoUrl: string;
  brandColor: string;
  iban: string | null;
}

export const DEFAULT_BRANDING: OrgBranding = {
  name: DEFAULT_ORGANIZATION_NAME,
  logoUrl: DEFAULT_LOGO_URL,
  brandColor: DEFAULT_BRAND_COLOR,
  iban: null,
};

// Valt terug op de default zodra de organizations-tabel nog niet bestaat (migratie nog niet
// gedraaid) of er nog geen rij is voor deze eigenaar — nooit een lege/kapotte pagina.
export async function getOrganizationName(ownerUserId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("name")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  return data?.name || DEFAULT_ORGANIZATION_NAME;
}

// Centrale white-label-huisstijl (naam, logo, accentkleur) voor zowel de interne app-navigatie
// en portalen als gedownloade PDF's — met dezelfde nooit-kapot-vallende default als
// getOrganizationName hierboven.
export async function getOrgBranding(ownerUserId: string | null | undefined): Promise<OrgBranding> {
  if (!ownerUserId) return DEFAULT_BRANDING;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("name, logo_url, brand_color, iban")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (!data) return DEFAULT_BRANDING;

  return {
    name: data.name || DEFAULT_ORGANIZATION_NAME,
    logoUrl: data.logo_url || DEFAULT_LOGO_URL,
    brandColor: data.brand_color || DEFAULT_BRAND_COLOR,
    iban: data.iban || null,
  };
}

// Zorgt dat er een organizations-rij (en dus een ics_token) bestaat voor deze eigenaar, ook
// voor accounts van vóór de signup-flow die zo'n rij automatisch aanmaakt. on conflict op de
// bestaande unique constraint owner_user_id — bestaande rij blijft ongemoeid, alleen het
// ontbrekende geval krijgt een nieuwe met default-waarden.
export async function getOrCreateIcsToken(ownerUserId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("organizations")
    .select("ics_token")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (existing?.ics_token) return existing.ics_token;

  const { data: created } = await admin
    .from("organizations")
    .upsert({ owner_user_id: ownerUserId }, { onConflict: "owner_user_id" })
    .select("ics_token")
    .single();

  return created!.ics_token;
}
