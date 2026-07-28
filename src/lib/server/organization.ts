import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ORGANIZATION_NAME = "The Bridge Group B.V.";
export const DEFAULT_LOGO_URL = "/logo.png";
export const DEFAULT_BRAND_COLOR = "#7CFC6E";

export interface OrgBranding {
  name: string;
  logoUrl: string;
  brandColor: string;
}

export const DEFAULT_BRANDING: OrgBranding = {
  name: DEFAULT_ORGANIZATION_NAME,
  logoUrl: DEFAULT_LOGO_URL,
  brandColor: DEFAULT_BRAND_COLOR,
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
    .select("name, logo_url, brand_color")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (!data) return DEFAULT_BRANDING;

  return {
    name: data.name || DEFAULT_ORGANIZATION_NAME,
    logoUrl: data.logo_url || DEFAULT_LOGO_URL,
    brandColor: data.brand_color || DEFAULT_BRAND_COLOR,
  };
}
