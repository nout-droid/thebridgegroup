import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { checkCanViewBudget } from "@/lib/server/team";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSubNav } from "../../../project-sub-nav";
import { ProductionSubNav } from "../../production-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

interface HoursRow {
  id: string;
  name: string;
  role: string;
  per_diem_rate: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

const HOURS_PAGE_LABELS = [
  "Uren",
  "Gewerkte uren op basis van in-/uitchecken via de badge — voor freelancer-facturatie of urenexport.",
  "Exporteer als CSV",
  "Naam",
  "Functie",
  "Ingecheckt",
  "Uitgecheckt",
  "Uren",
  "Dagvergoeding",
  "Totaal",
  "Nog niemand in-/uitgecheckt voor dit project.",
  "Terug naar Crew & Accreditatie",
];

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function hoursWorked(checkedIn: string | null, checkedOut: string | null): number | null {
  if (!checkedIn || !checkedOut) return null;
  const ms = new Date(checkedOut).getTime() - new Date(checkedIn).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

export default async function CrewHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, canViewBudget, { data: members }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    checkCanViewBudget(supabase, id),
    supabase
      .from("crew_members")
      .select("id, name, role, per_diem_rate, checked_in_at, checked_out_at")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<HoursRow[]>(),
    getAppLang(),
  ]);

  if (!canViewBudget) notFound();

  const t = await createTranslator(lang, HOURS_PAGE_LABELS);
  const rows = members ?? [];
  const totalHours = rows.reduce((sum, r) => sum + (hoursWorked(r.checked_in_at, r.checked_out_at) ?? 0), 0);
  const totalPerDiem = rows
    .filter((r) => r.checked_in_at)
    .reduce((sum, r) => sum + r.per_diem_rate, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="crew" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{t("Uren")}</CardTitle>
              <a
                href={`/projects/${project.id}/production/crew/hours/export`}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
              >
                {t("Exporteer als CSV")}
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Gewerkte uren op basis van in-/uitchecken via de badge — voor freelancer-facturatie of urenexport."
              )}
            </p>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog niemand in-/uitgecheckt voor dit project.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3">{t("Naam")}</th>
                      <th className="py-2 pr-3">{t("Functie")}</th>
                      <th className="py-2 pr-3">{t("Ingecheckt")}</th>
                      <th className="py-2 pr-3">{t("Uitgecheckt")}</th>
                      <th className="py-2 pr-3 text-right">{t("Uren")}</th>
                      <th className="py-2 text-right">{t("Dagvergoeding")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const hours = hoursWorked(row.checked_in_at, row.checked_out_at);
                      return (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{row.name}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{row.role || "—"}</td>
                          <td className="py-2 pr-3">{formatTime(row.checked_in_at)}</td>
                          <td className="py-2 pr-3">{formatTime(row.checked_out_at)}</td>
                          <td className="py-2 pr-3 text-right">{hours != null ? hours.toFixed(1) : "—"}</td>
                          <td className="py-2 text-right">
                            {row.checked_in_at ? `€ ${row.per_diem_rate.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="pt-2" colSpan={4}>
                        {t("Totaal")}
                      </td>
                      <td className="pt-2 text-right">{totalHours.toFixed(1)}</td>
                      <td className="pt-2 text-right">€ {totalPerDiem.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <Link href={`/projects/${project.id}/production`} className="text-sm text-primary underline">
          &larr; {t("Terug naar Crew & Accreditatie")}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
