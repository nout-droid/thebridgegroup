import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Elke gebruiker werkt binnen precies één team: de eigenaar zelf, of de
 * eigenaar van het team waar hij als lid aan is toegevoegd. Geeft de
 * owner_user_id van dat team terug (= de eigen user_id als er geen
 * team_members-rij voor deze gebruiker bestaat).
 */
export async function getTeamOwnerId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", userId)
    .maybeSingle();

  return data?.owner_user_id ?? userId;
}

/**
 * Mag de ingelogde gebruiker de Begroting (kostprijzen/marges) van dit project
 * zien? True voor de eigenaar altijd; voor een teamlid alleen als hij toegang
 * heeft tot het project ÉN can_view_budget aanstaat op zijn team_members-rij.
 */
export async function checkCanViewBudget(supabase: SupabaseClient, projectId: string) {
  const { data } = await supabase.rpc("can_view_budget", { p_project_id: projectId });
  return Boolean(data);
}

/**
 * Welke navigatie-onderdelen mag deze gebruiker zien? null = alles (eigenaar, of teamlid
 * zonder toegewezen rol — bestaand gedrag vóór rollen, geen regressie). Anders de
 * nav_sections van de aan het teamlid gekoppelde rol.
 */
export async function getViewerNavSections(
  supabase: SupabaseClient,
  userId: string
): Promise<string[] | null> {
  const { data: member } = await supabase
    .from("team_members")
    .select("role_id, owner_user_id")
    .eq("member_user_id", userId)
    .maybeSingle();

  if (!member || member.owner_user_id === userId) return null;
  if (!member.role_id) return null;

  const { data: role } = await supabase
    .from("team_roles")
    .select("nav_sections")
    .eq("id", member.role_id)
    .maybeSingle<{ nav_sections: string[] }>();

  return role?.nav_sections ?? null;
}

/**
 * Combineert getTeamOwnerId + getViewerNavSections in één team_members-select i.p.v. twee
 * losse queries op dezelfde rij — gebruikt in nav.tsx, dat op vrijwel elke ingelogde pagina
 * draait, dus dat verschil telt op (zie ook co2_totals() voor dezelfde reden).
 */
export async function getViewerTeamInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ownerId: string; navSections: string[] | null }> {
  const { data: member } = await supabase
    .from("team_members")
    .select("role_id, owner_user_id")
    .eq("member_user_id", userId)
    .maybeSingle();

  if (!member) return { ownerId: userId, navSections: null };
  if (member.owner_user_id === userId || !member.role_id) {
    return { ownerId: member.owner_user_id, navSections: null };
  }

  const { data: role } = await supabase
    .from("team_roles")
    .select("nav_sections")
    .eq("id", member.role_id)
    .maybeSingle<{ nav_sections: string[] }>();

  return { ownerId: member.owner_user_id, navSections: role?.nav_sections ?? null };
}
