import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type LogAuditParams = {
  ownerId: string;
  actorLabel: string;
  action: string;
  details?: string;
};

// Logt gevoelige acties (projectverwijdering, teamwijzigingen, accountverwijdering) zodat
// een eigenaar/beheerder achteraf kan zien wie wat heeft gedaan — zie het "Logboek" op
// /team. Aparte tabel van activity_log hierboven: dat logt klant-/leverancierswijzigingen
// per project, dit logt beheerdersacties op organisatieniveau.
export async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  params: LogAuditParams
) {
  await admin.from("audit_log").insert({
    owner_user_id: params.ownerId,
    actor_label: params.actorLabel,
    action: params.action,
    details: params.details ?? "",
  });
}
