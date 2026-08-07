import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeClientPrice, type Category, type Project } from "@/lib/types";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { YearComparisonChart } from "./analytics-charts";

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
  "Jaaroverzicht",
  "Omzet, kosten en marge per jaar, op basis van de event-datum.",
  "Jaar",
  "Aantal",
  "Kosten",
  "Omzet",
  "Nog geen projecten met een event-datum om per jaar te vergelijken.",
  "Forecast",
  "Voorspelling voor dit jaar op basis van het tempo van boekingen t.o.v. vorig jaar.",
  "Al vastgelegd dit jaar",
  "Voorspeld jaartotaal",
  "vs. vorig jaar op dit punt in het jaar",
  "Nog niet genoeg historie voor een trendvoorspelling — dit toont alleen het al vastgelegde bedrag.",
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

  // projects/lang hebben geen onderlinge afhankelijkheid — parallel opvragen. De rest van deze
  // pagina rolt gegevens op over ALLE projecten van de eigenaar (dat is het hele punt van deze
  // pagina), dus een simpele .limit() zou stilletjes verkeerde totalen geven; in plaats daarvan
  // scopen we categories/quotes/actual_costs expliciet op de net opgehaalde project-/category-ID's
  // i.p.v. puur op RLS te vertrouwen om de volledige tabel te scannen.
  const [{ data: projects }, lang] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, client_name, event_date, created_at")
      .order("event_date", { ascending: false })
      .returns<Pick<Project, "id" | "name" | "client_name" | "event_date" | "created_at">[]>(),
    getAppLang(),
  ]);

  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: categories }, { data: actualCosts }] = await Promise.all([
    projectIds.length
      ? supabase
          .from("categories")
          .select("id, project_id, name, margin_type, margin_value, manual_cost")
          .in("project_id", projectIds)
          .returns<CategoryRow[]>()
      : Promise.resolve({ data: [] as CategoryRow[] }),
    projectIds.length
      ? supabase
          .from("actual_costs")
          .select("project_id, category_id, amount")
          .in("project_id", projectIds)
          .returns<ActualCostRow[]>()
      : Promise.resolve({ data: [] as ActualCostRow[] }),
  ]);

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: quotes } = categoryIds.length
    ? await supabase
        .from("quotes")
        .select("category_id, cost_price, status")
        .in("category_id", categoryIds)
        .returns<QuoteRow[]>()
    : { data: [] as QuoteRow[] };

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

  // ---- Jaaroverzicht + forecast ----
  // Jaar wordt afgeleid uit event_date (niet created_at) — dat is het jaar waarin het
  // event daadwerkelijk plaatsvindt, dezelfde as die overal elders in de app leidend is.
  interface YearStat {
    year: number;
    count: number;
    cost: number;
    client: number;
    margin: number;
  }
  const yearStats = new Map<number, YearStat>();
  for (const row of projectMargins) {
    if (!row.project.event_date) continue;
    const year = new Date(`${row.project.event_date}T00:00:00`).getFullYear();
    const stat = yearStats.get(year) ?? { year, count: 0, cost: 0, client: 0, margin: 0 };
    stat.count += 1;
    stat.cost += row.cost;
    stat.client += row.client;
    stat.margin += row.margin;
    yearStats.set(year, stat);
  }
  const yearRows = [...yearStats.values()].sort((a, b) => b.year - a.year).slice(0, 6);
  const yearChartData = [...yearRows]
    .reverse()
    .map((y) => ({ year: String(y.year), omzet: Math.round(y.client), marge: Math.round(y.margin) }));

  // Forecast: vergelijk hoeveel omzet voor dit jaar tot nu toe is VASTGELEGD (created_at van
  // het project, dus het boekingstempo) met hoeveel er op hetzelfde punt vorig jaar was
  // vastgelegd voor de events van toen — dat is een eerlijkere maat dan "events die al hebben
  // plaatsgevonden", want in de eventbranche wordt vrijwel alles ver van tevoren geboekt.
  // Die groei passen we toe op de omzet van heel vorig jaar — een eenvoudige, uitlegbare
  // trendvoorspelling. Zonder vorig-jaar-data tonen we alleen het al vastgelegde bedrag.
  const today = new Date();
  const currentYear = today.getFullYear();
  const previousYear = currentYear - 1;
  const todayStr = today.toISOString().slice(0, 10);
  const previousYearCutoff = `${previousYear}-${todayStr.slice(5)}`;

  let toDateThisYear = 0;
  let toDateLastYear = 0;
  for (const row of projectMargins) {
    const eventDate = row.project.event_date;
    if (!eventDate) continue;
    const bookedDate = row.project.created_at.slice(0, 10);
    if (eventDate.slice(0, 4) === String(currentYear) && bookedDate <= todayStr) toDateThisYear += row.client;
    if (eventDate.slice(0, 4) === String(previousYear) && bookedDate <= previousYearCutoff) toDateLastYear += row.client;
  }

  const bookedThisYear = yearStats.get(currentYear)?.client ?? 0;
  const bookedMarginThisYear = yearStats.get(currentYear)?.margin ?? 0;
  const lastYearTotal = yearStats.get(previousYear)?.client ?? 0;
  const lastYearMarginTotal = yearStats.get(previousYear)?.margin ?? 0;
  const growthPct = toDateLastYear > 0 ? ((toDateThisYear - toDateLastYear) / toDateLastYear) * 100 : null;
  const forecastTotal =
    growthPct != null ? Math.max(lastYearTotal * (1 + growthPct / 100), bookedThisYear) : bookedThisYear;
  const forecastMargin =
    growthPct != null ? Math.max(lastYearMarginTotal * (1 + growthPct / 100), bookedMarginThisYear) : bookedMarginThisYear;

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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Jaaroverzicht")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Omzet, kosten en marge per jaar, op basis van de event-datum.")}
              </p>
            </CardHeader>
            <CardContent>
              {yearRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("Nog geen projecten met een event-datum om per jaar te vergelijken.")}
                </p>
              ) : (
                <>
                  <YearComparisonChart data={yearChartData} omzetLabel={t("Omzet")} margeLabel={t("Marge")} />
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-3">{t("Jaar")}</th>
                          <th className="py-2 pr-3 text-right">{t("Aantal")}</th>
                          <th className="py-2 pr-3 text-right">{t("Kosten")}</th>
                          <th className="py-2 pr-3 text-right">{t("Omzet")}</th>
                          <th className="py-2 text-right">{t("Marge")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearRows.map((y) => (
                          <tr key={y.year} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{y.year}</td>
                            <td className="py-2 pr-3 text-right text-muted-foreground">{y.count}</td>
                            <td className="py-2 pr-3 text-right">{euro(y.cost)}</td>
                            <td className="py-2 pr-3 text-right">{euro(y.client)}</td>
                            <td className="py-2 text-right font-medium">{euro(y.margin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Forecast")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Voorspelling voor dit jaar op basis van het tempo van boekingen t.o.v. vorig jaar.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("Al vastgelegd dit jaar")}
                  </p>
                  <p className="text-2xl font-semibold">{euro(bookedThisYear)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Marge")}: {euro(bookedMarginThisYear)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Voorspeld jaartotaal")}</p>
                  <p className="text-2xl font-semibold">{euro(forecastTotal)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Marge")}: {euro(forecastMargin)}
                  </p>
                </div>
              </div>
              {growthPct != null ? (
                <p className={`text-sm font-medium ${growthPct >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {growthPct >= 0 ? "+" : ""}
                  {growthPct.toFixed(0)}% {t("vs. vorig jaar op dit punt in het jaar")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("Nog niet genoeg historie voor een trendvoorspelling — dit toont alleen het al vastgelegde bedrag.")}
                </p>
              )}
            </CardContent>
          </Card>
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
