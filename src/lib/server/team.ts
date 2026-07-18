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
