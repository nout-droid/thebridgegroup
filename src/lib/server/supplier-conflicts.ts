import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/lib/types";

export interface SupplierConflict {
  projectId: string;
  projectName: string;
  start: string;
  end: string;
}

type ProjectWindowFields = Pick<
  Project,
  "build_start_date" | "strike_end_date" | "show_start_date" | "show_end_date" | "event_date"
>;

// De bezettingsperiode van een project: vanaf opbouw tot einde afbraak (het venster waarin een
// leverancier fysiek aan dit project vastzit), met terugval op de show-periode en tot slot de
// enkele event_date voor oudere projecten die nog geen datumbereik hebben ingevuld.
function occupationWindow(project: ProjectWindowFields): { start: string; end: string } | null {
  const start = project.build_start_date ?? project.show_start_date ?? project.event_date;
  const end = project.strike_end_date ?? project.show_end_date ?? project.event_date;
  if (!start || !end) return null;
  return { start, end };
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

interface QuoteCategoryRow {
  supplier_id: string;
  category: { project_id: string } | { project_id: string }[] | null;
}

interface OtherProjectRow extends ProjectWindowFields {
  id: string;
  name: string;
}

// Voor elke leverancier die in dit project een bevestigde ("gekozen") offerte heeft: op welke
// ANDERE projecten van dezelfde eigenaar is diezelfde leverancier ook al bevestigd, met een
// overlappende bezettingsperiode? Geeft een lege Map terug zodra het huidige project geen
// bruikbaar datumbereik heeft (dan is overlap niet vast te stellen).
export async function getSupplierConflicts(
  supabase: SupabaseClient,
  project: Project
): Promise<Map<string, SupplierConflict[]>> {
  const window = occupationWindow(project);
  if (!window) return new Map();

  const { data: ownQuoteRows } = await supabase
    .from("quotes")
    .select("supplier_id, category:categories!inner(project_id)")
    .eq("status", "gekozen")
    .eq("category.project_id", project.id)
    .returns<QuoteCategoryRow[]>();

  const supplierIds = [...new Set((ownQuoteRows ?? []).map((row) => row.supplier_id))];
  if (!supplierIds.length) return new Map();

  const { data: otherQuoteRows } = await supabase
    .from("quotes")
    .select("supplier_id, category:categories!inner(project_id)")
    .eq("status", "gekozen")
    .in("supplier_id", supplierIds)
    .returns<QuoteCategoryRow[]>();

  const otherProjectIdsBySupplier = new Map<string, Set<string>>();
  for (const row of otherQuoteRows ?? []) {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    if (!category || category.project_id === project.id) continue;
    const set = otherProjectIdsBySupplier.get(row.supplier_id) ?? new Set<string>();
    set.add(category.project_id);
    otherProjectIdsBySupplier.set(row.supplier_id, set);
  }

  const otherProjectIds = [...new Set([...otherProjectIdsBySupplier.values()].flatMap((set) => [...set]))];
  if (!otherProjectIds.length) return new Map();

  const { data: otherProjects } = await supabase
    .from("projects")
    .select("id, name, build_start_date, strike_end_date, show_start_date, show_end_date, event_date")
    .in("id", otherProjectIds)
    .returns<OtherProjectRow[]>();

  const conflictsBySupplier = new Map<string, SupplierConflict[]>();
  for (const [supplierId, projectIds] of otherProjectIdsBySupplier) {
    for (const projectId of projectIds) {
      const other = (otherProjects ?? []).find((p) => p.id === projectId);
      if (!other) continue;
      const otherWindow = occupationWindow(other);
      if (!otherWindow) continue;
      if (!rangesOverlap(window.start, window.end, otherWindow.start, otherWindow.end)) continue;

      const list = conflictsBySupplier.get(supplierId) ?? [];
      list.push({
        projectId: other.id,
        projectName: other.name,
        start: otherWindow.start,
        end: otherWindow.end,
      });
      conflictsBySupplier.set(supplierId, list);
    }
  }

  return conflictsBySupplier;
}
