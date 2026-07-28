import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/lib/types";

export const TRIAL_PROJECT_LIMIT = 3;

// Statussen die Stripe zelf teruggeeft en die wij als "geen actief abonnement" behandelen.
const BLOCKED_STATUSES = new Set([
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

export type OrgAccessStatus =
  | "no_org" // organizations-tabel bestaat nog niet of geen rij — nooit blokkeren (backwards compat)
  | "active" // betalend en actief
  | "trialing" // binnen proefperiode
  | "trial_expired" // proefperiode verlopen op datum
  | "blocked"; // abonnement opgezegd / betaling mislukt

export interface OrgAccess {
  status: OrgAccessStatus;
  canCreateProject: boolean;
  projectLimitReached: boolean;
  trialEndsAt: string | null;
  message?: string;
}

// Centrale toegangscheck voor alle abonnement-afhankelijke acties. Blokkeert alleen het
// aanmaken van nieuw werk (nieuwe projecten) — bestaande data blijft zichtbaar/exporteerbaar
// zodat een opgezegde klant nooit zomaar zijn gegevens kwijtraakt, maar geen nieuwe waarde
// meer uit het platform kan halen zonder actief abonnement.
export async function getOrgAccess(ownerId: string): Promise<OrgAccess> {
  const admin = createAdminClient();
  const { data: organization } = await admin
    .from("organizations")
    .select("*")
    .eq("owner_user_id", ownerId)
    .maybeSingle<Organization>();

  if (!organization) {
    return { status: "no_org", canCreateProject: true, projectLimitReached: false, trialEndsAt: null };
  }

  const trialEndsAt = organization.trial_ends_at;

  if (organization.subscription_status === "active") {
    return { status: "active", canCreateProject: true, projectLimitReached: false, trialEndsAt };
  }

  if (organization.plan === "trial" && organization.subscription_status === "trialing") {
    const expired = trialEndsAt ? new Date(trialEndsAt).getTime() < Date.now() : false;
    if (expired) {
      return {
        status: "trial_expired",
        canCreateProject: false,
        projectLimitReached: false,
        trialEndsAt,
        message: "Je proefperiode is verlopen. Upgrade je abonnement op /team om verder te kunnen werken.",
      };
    }

    const { count } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ownerId);
    const projectLimitReached = (count ?? 0) >= TRIAL_PROJECT_LIMIT;

    return {
      status: "trialing",
      canCreateProject: !projectLimitReached,
      projectLimitReached,
      trialEndsAt,
      message: projectLimitReached
        ? `Je proefperiode is beperkt tot ${TRIAL_PROJECT_LIMIT} projecten. Upgrade je abonnement op /team om meer aan te maken.`
        : undefined,
    };
  }

  return {
    status: "blocked",
    canCreateProject: false,
    projectLimitReached: false,
    trialEndsAt,
    message: "Je abonnement is niet meer actief. Upgrade je abonnement op /team om verder te kunnen werken.",
  };
}
