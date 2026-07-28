import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ORGANIZATION_NAME = "The Bridge AV Group";

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
