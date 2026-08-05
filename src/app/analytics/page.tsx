import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeClientPrice, type Category, type Project } from "@/lib/types";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const ANALYTICS_PAGE_LABELS = [
  "Analytics",
  "Marge, klanten en kostenoverschrijding over al je projecten heen.",
  "Marge per project",
  "Project",
  "Klant",
  "Datum",
  "Inkoop",
  "Klantprijs",
  "Marge",
  "Nog geen projecten met een gekozen offerte of stelpost.",
  "Top klanten op marge",
  "Nog geen marge-data.",
  "Gemiddelde overschrijding per categorie",
  "Vergelijkt werkelijke kosten met de begrote inkoopprijs (gekozen offerte of stelpost) — alleen categorieën met beide.",
  "Categorie",
  "Gem. afwijking",
  "Aantal projecten",
  "Nog geen werkelijke kosten geregistreerd.",
];

interface QuoteRow {
  category_id: string;
  cost_price: number;
  status: string;
}

type CategoryRow = Pick<Category, "id" | "project_id" | "name" | "margin_type" | "margin_value" | "manual_cost">;

interface ActualCostRow {
  project_id: string;
  category_id: string | null;
  amount: number;
}

function euro(value: number) {
  return `€ ${value.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: categories }, { data: quotes }, { data: actualCosts }, lang] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, client_name, event_date")
        .order("event_date", { ascending: false })
        .returns<Pick<Project, "id" | "name" | "client_name" | "event_date">[]>(),
      supabase
        .from("categories")
        .select("id, project_id, name, margin_type, margin_value, manual_cost")
        .returns<CategoryRow[]>(),
      supabase.from("quotes").select("category_id, cost_price, status").returns<QuoteRow[]>(),
      supabase.from("actual_costs").select("project_id, category_id, amount").returns<ActualCostRow[]>(),
      getAppLang(),
    ]);

  const t = await createTranslator(lang, ANALYTICS_PAGE_LABELS);

  const chosenCostByCategory = new Map<string, number>();
  for (const q of quotes ?? []) {
    if (q.status === "gekozen") chosenCostByCategory.set(q.category_id, q.cost_price);
  }

  // Begrote inkoopprijs per categorie: gekozen offerte wint, anders de stelpost (manual_cost).
  const budgetedCostByCategory = new Map<string, number>();
  for (const c of categories ?? []) {
    const cost = chosenCostByCategory.get(c.id) ?? c.manual_cost;
    if (cost != null) budgetedCostByCategory.set(c.id, cost);
  }

  // ---- Marge per project ----
  const categoriesByProject = new Map<string, CategoryRow[]>();
  for (const c of categories ?? []) {
    const list = categoriesByProject.get(c.project_id) ?? [];
    list.push(c);
    categoriesByProject.set(c.project_id, list);
  }

  const projectMargins = (projects ?? [])
    .map((project) => {
      const cats = categoriesByProject.get(project.id) ?? [];
      let cost = 0;
      let client = 0;
      for (const c of cats) {
        const budgetedCost = budgetedCostByCategory.get(c.id);
        if (budgetedCost == null) continue;
        cost += budgetedCost;
        client += computeClientPrice(c as Category, budgetedCost);
      }
      return { project, cost, client, margin: client - cost, marginPct: client > 0 ? ((client - cost) / client) * 100 : 0 };
    })
    .filter((row) => row.cost > 0 || row.client > 0);

  // ---- Top klanten op marge ----
  const marginByClient = new Map<string, number>();
  for (const row of projectMargins) {
    const client = row.project.client_name || "—";
    marginByClient.set(client, (marginByClient.get(client) ?? 0) + row.margin);
  }
  const topClients = [...marginByClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ---- Gemiddelde overschrijding per categorie(naam) ----
  const actualByCategory = new Map<string, number>();
  for (const a of actualCosts ?? []) {
    if (!a.category_id) continue;
    actualByCategory.set(a.category_id, (actualByCategory.get(a.category_id) ?? 0) + a.amount);
  }

  const overrunsByName = new Map<string, number[]>();
  for (const c of categories ?? []) {
    const budgeted = budgetedCostByCategory.get(c.id);
    const actual = actualByCategory.get(c.id);
    if (!budgeted || actual == null) continue;
    const pct = ((actual - budgeted) / budgeted) * 100;
    const name = c.name.trim() || "—";
    const list = overrunsByName.get(name) ?? [];
    list.push(pct);
    overrunsByName.set(name, list);
  }
  const categoryOverruns = [...overrunsByName.entries()]
    .map(([name, pcts]) => ({
      name,
      avgPct: pcts.reduce((sum, p) => sum + p, 0) / pcts.length,
      count: pcts.length,
    }))
    .sort((a, b) => b.avgPct - a.avgPct);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold">{t("Analytics")}</h1>
          <p className="text-sm text-muted-foreground">{t("Marge, klanten en kostenoverschrijding over al je projecten heen.")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Marge per project")}</CardTitle>
          </CardHeader>
          <CardContent>
            {projectMargins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("Nog geen projecten met een gekozen offerte of stelpost.")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3">{t("Project")}</th>
                      <th className="py-2 pr-3">{t("Klant")}</th>
                      <th className="py-2 pr-3">{t("Datum")}</th>
                      <th className="py-2 pr-3 text-right">{t("Inkoop")}</th>
                      <th className="py-2 pr-3 text-right">{t("Klantprijs")}</th>
                      <th className="py-2 text-right">{t("Marge")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectMargins.map((row) => (
                      <tr key={row.project.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{row.project.name}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{row.project.client_name || "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {row.project.event_date
                            ? new Date(`${row.project.event_date}T00:00:00`).toLocaleDateString("nl-NL")
                            : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right">{euro(row.cost)}</td>
                        <td className="py-2 pr-3 text-right">{euro(row.client)}</td>
                        <td className="py-2 text-right font-medium">
                          {euro(row.margin)} <span className="text-xs text-muted-foreground">({row.marginPct.toFixed(0)}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Top klanten op marge")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen marge-data.")}</p>
            ) : (
              <ul className="space-y-2">
                {topClients.map(([client, margin]) => (
                  <li key={client} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                    <span className="font-medium">{client}</span>
                    <span>{euro(margin)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Gemiddelde overschrijding per categorie")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Vergelijkt werkelijke kosten met de begrote inkoopprijs (gekozen offerte of stelpost) — alleen categorieën met beide."
              )}
            </p>
          </CardHeader>
          <CardContent>
            {categoryOverruns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen werkelijke kosten geregistreerd.")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">{t("Categorie")}</th>
                    <th className="py-2 pr-3 text-right">{t("Gem. afwijking")}</th>
                    <th className="py-2 text-right">{t("Aantal projecten")}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryOverruns.map((row) => (
                    <tr key={row.name} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.name}</td>
                      <td className={`py-2 pr-3 text-right ${row.avgPct > 0 ? "text-red-600" : "text-green-700"}`}>
                        {row.avgPct > 0 ? "+" : ""}
                        {row.avgPct.toFixed(0)}%
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
