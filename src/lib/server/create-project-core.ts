import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgAccess } from "@/lib/server/subscription";
import { getTeamOwnerId } from "@/lib/server/team";

function generateEventCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Zelfde security-definer RPC als createProject in src/app/projects/actions.ts (zie
// migrations_create_project_secure_rpc.sql) — hier los getrokken zodat de CRM een lead
// ook rechtstreeks in een project kan omzetten, zonder createProject's eigen flow
// (redirect + form) over te nemen.
export async function createProjectForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  authUserId: string,
  fields: { name: string; clientName: string; eventDate: string | null }
): Promise<{ projectId: string | null; error: string | null }> {
  const ownerId = await getTeamOwnerId(supabase, authUserId);

  const access = await getOrgAccess(ownerId);
  if (!access.canCreateProject) {
    return {
      projectId: null,
      error: access.message ?? "Upgrade je abonnement op /team om verder te gaan.",
    };
  }

  const { data: newId, error } = await supabase.rpc("create_project_secure", {
    p_owner_id: ownerId,
    p_name: fields.name,
    p_client_name: fields.clientName,
    p_event_date: fields.eventDate,
    p_event_code: generateEventCode(),
  });

  if (error || !newId) {
    return { projectId: null, error: error?.message ?? "Onbekende fout" };
  }

  return { projectId: newId as string, error: null };
}
