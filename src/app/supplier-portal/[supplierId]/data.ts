import { createAdminClient } from "@/lib/supabase/admin";

export interface SupplierProject {
  id: string;
  name: string;
  event_date: string | null;
}

interface QuoteProjectRow {
  category: { project: { id: string; name: string; event_date: string | null } | null } | null;
}

// Een leverancier "werkt aan" een project zodra er minstens één offerte voor 'm klaarstaat —
// zelfde afleiding als het bestaande offertes-dashboard, geen aparte koppel-stap nodig.
export async function getSupplierProjects(supplierId: string): Promise<SupplierProject[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quotes")
    .select("category:categories(project:projects(id, name, event_date))")
    .eq("supplier_id", supplierId)
    .returns<QuoteProjectRow[]>();

  const byId = new Map<string, SupplierProject>();
  for (const row of data ?? []) {
    const project = row.category?.project;
    if (project) byId.set(project.id, project);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function isSupplierLinkedToProject(supplierId: string, projectId: string) {
  const projects = await getSupplierProjects(supplierId);
  return projects.some((p) => p.id === projectId);
}
