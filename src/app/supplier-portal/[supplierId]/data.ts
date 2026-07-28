import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SupplierProject {
  id: string;
  name: string;
  event_date: string | null;
  suppliers_manage_travel: boolean;
}

interface QuoteProjectRow {
  category: {
    project: { id: string; name: string; event_date: string | null; suppliers_manage_travel: boolean } | null;
  } | null;
}

// Een leverancier "werkt aan" een project zodra er minstens één offerte voor 'm klaarstaat —
// zelfde afleiding als het bestaande offertes-dashboard, geen aparte koppel-stap nodig.
export async function getSupplierProjects(supplierId: string): Promise<SupplierProject[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quotes")
    .select("category:categories(project:projects(id, name, event_date, suppliers_manage_travel))")
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

// Gedeelde auth-check + supplier-fetch die elke supplier-portal-pagina nodig heeft: ofwel
// de producent zelf (preview via zijn eigen login), ofwel een geldig supplier_token-cookie —
// zelfde herbruikbare patroon als getProjectOrNotFound in de interne app.
export async function getAuthorizedSupplier(supplierId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: ownedSupplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .maybeSingle();
    isOwner = Boolean(ownedSupplier);
  }

  if (!isOwner) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`supplier_token_${supplierId}`)) {
      redirect("/supplier-portal");
    }
  }

  const admin = createAdminClient();
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) notFound();

  return { supplier, isOwner };
}
