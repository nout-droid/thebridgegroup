import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamRoleDef } from "@/lib/types";

const ALL_SECTIONS = [
  "projects",
  "calendar",
  "analytics",
  "crm",
  "tenders",
  "suppliers",
  "freelancers",
  "equipment",
  "venues",
  "clients",
  "team",
];

// Vijf standaardrollen, eenmalig aangemaakt per organisatie zodra iemand de rollen-instellingen
// opent — daarna volledig zelf aan te passen/aan te vullen (organisatie-eigen rijen, geen
// gedeelde/globale templates). "Technisch producent" en "Crew" krijgen bewust geen
// nav_sections buiten hun kernwerk; welke PROJECTEN ze zien blijft (zoals nu al) per teamlid
// apart toegewezen via team_member_project_access.
const DEFAULT_ROLES: Omit<TeamRoleDef, "id" | "owner_user_id" | "created_at">[] = [
  {
    name: "Management",
    all_projects: true,
    can_view_budget: true,
    can_edit: true,
    nav_sections: ALL_SECTIONS,
    sort_order: 0,
  },
  {
    name: "Technisch producent",
    all_projects: false,
    can_view_budget: true,
    can_edit: true,
    nav_sections: ["projects", "calendar", "suppliers", "freelancers", "equipment", "venues"],
    sort_order: 1,
  },
  {
    name: "Sales",
    all_projects: true,
    can_view_budget: true,
    can_edit: true,
    nav_sections: ["projects", "calendar", "analytics", "crm", "tenders", "clients"],
    sort_order: 2,
  },
  {
    name: "Planner",
    all_projects: false,
    can_view_budget: false,
    can_edit: true,
    nav_sections: ["freelancers", "equipment", "calendar"],
    sort_order: 3,
  },
  {
    name: "Crew",
    all_projects: false,
    can_view_budget: false,
    can_edit: false,
    nav_sections: ["projects"],
    sort_order: 4,
  },
];

export async function ensureDefaultTeamRoles(
  supabase: SupabaseClient<any>,
  ownerId: string
): Promise<TeamRoleDef[]> {
  const { data: existing } = await supabase
    .from("team_roles")
    .select("*")
    .eq("owner_user_id", ownerId)
    .order("sort_order", { ascending: true })
    .returns<TeamRoleDef[]>();

  if (existing && existing.length > 0) return existing;

  const { data: inserted } = await supabase
    .from("team_roles")
    .insert(DEFAULT_ROLES.map((role) => ({ ...role, owner_user_id: ownerId })))
    .select("*")
    .returns<TeamRoleDef[]>();

  return inserted ?? [];
}
