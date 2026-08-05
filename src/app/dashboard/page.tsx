import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_STATUS_LABELS,
  type Category,
  type CategoryStatus,
  type ClientRequest,
  type OpenQuestion,
  type Project,
  type Quote,
} from "@/lib/types";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { DashboardCharts, type DashboardChartsLabels } from "./dashboard-charts";

// Categorieën die nog niet bevestigd zijn en waar dus nog leveranciersactie nodig is —
// "leverancier_gekozen" telt hier niet mee, die wacht alleen nog op een laatste bevestiging.
const OPEN_CATEGORY_STATUSES: CategoryStatus[] = ["concept", "aanvraag_verstuurd", "offertes_binnen"];

const TASK_LIST_LIMIT = 8;
const UPCOMING_LIMIT = 8;
const PROJECT_CHART_LIMIT = 12;

// Zelfde lokale vertaal-dictionaries als src/app/projects/[id]/page.tsx en
// src/app/share/[token]/share-view.tsx gebruiken voor deze twee kolommen — niet gedeeld
// tussen bestanden in deze codebase, dus hier bewust op dezelfde manier gedupliceerd i.p.v.
// een nieuw gedeeld patroon te introduceren.
const CLIENT_REQUEST_CATEGORY_LABELS: Record<string, string> = {
  catering: "Catering",
  materieel: "Materieel",
  comms: "Comms & Portofoons",
  stroom: "Stroom",
  hotel: "Hotel",
  vlucht: "Vlucht",
  overig: "Overig",
};

const CLIENT_REQUEST_STATUS_LABELS: Record<string, string> = {
  new: "Nieuw",
  acknowledged: "In behandeling",
  done: "Afgehandeld",
};

const DASHBOARD_LABELS = [
  "Dashboard",
  "Overzicht van openstaande taken en financiën over al je projecten.",
  "Nog geen projecten. Maak je eerste project aan om te beginnen met begroten.",
  "Open taken",
  "Categorieën die nog op een leverancier wachten",
  "Alle categorieën zijn bevestigd, of wachten nog niet op een leverancier.",
  "Openstaande klantverzoeken",
  "Geen openstaande klantverzoeken.",
  "Onbeantwoorde vragen",
  "Geen onbeantwoorde vragen.",
  "Begroting bij klant in afwachting",
  "Geen begrotingen in afwachting van een klantreactie.",
  "In afwachting",
  "meer",
  "Financieel overzicht",
  "Begrote kosten per actief project",
  "Nog geen begrote kosten om te tonen.",
  "Status categorieën (actieve projecten)",
  "Nog geen categorieën om te tonen.",
  "Eerstvolgende events",
  "Nog geen aankomende events.",
  "Klant:",
  ...Object.values(CATEGORY_STATUS_LABELS),
  ...Object.values(CLIENT_REQUEST_CATEGORY_LABELS),
  ...Object.values(CLIENT_REQUEST_STATUS_LABELS),
];

interface TaskItem {
  key: string;
  href: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

function TaskListCard({
  title,
  items,
  emptyText,
  extraCount,
  moreLabel,
}: {
  title: string;
  items: TaskItem[];
  emptyText: string;
  extraCount: number;
  moreLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                    {item.subtitle && (
                      <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </span>
                  {item.badge && (
                    <Badge variant="secondary" className="shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {extraCount > 0 && (
          <p className="pt-2 text-xs text-muted-foreground">
            +{extraCount} {moreLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function isActiveProject(project: Project, todayStr: string): boolean {
  return !project.event_date || project.event_date >= todayStr;
}

function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Deze drie hebben geen onderlinge afhankelijkheid — parallel opvragen i.p.v. na elkaar,
  // zelfde patroon als elders in deze codebase (bv. src/app/projects/[id]/page.tsx).
  const [
    {
      data: { user },
    },
    { data: projects },
    lang,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("projects")
      .select("*")
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(300)
      .returns<Project[]>(),
    getAppLang(),
  ]);

  if (!user) redirect("/login");

  const allProjects = projects ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);
  // "Actief" = event nog niet geweest (of nog geen datum bekend) — er is geen apart
  // archief/status-veld op projects, dus dit is de enige beschikbare aanknoping om oude,
  // afgelopen events uit de open-taken- en financiën-secties te weren.
  const activeProjects = allProjects.filter((p) => isActiveProject(p, todayStr));
  const activeProjectIds = activeProjects.map((p) => p.id);
  const projectNameById = new Map(allProjects.map((p) => [p.id, p.name]));

  const [
    { data: categories },
    { count: clientRequestCount },
    { data: clientRequestRows },
    { count: openQuestionCount },
    { data: openQuestionRows },
  ] = activeProjectIds.length
    ? await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .in("project_id", activeProjectIds)
          .order("created_at", { ascending: true })
          .limit(5000)
          .returns<Category[]>(),
        supabase
          .from("client_requests")
          .select("id", { count: "exact", head: true })
          .in("project_id", activeProjectIds)
          .neq("status", "done"),
        supabase
          .from("client_requests")
          .select("*")
          .in("project_id", activeProjectIds)
          .neq("status", "done")
          .order("created_at", { ascending: true })
          .limit(TASK_LIST_LIMIT)
          .returns<(ClientRequest & { project_id: string })[]>(),
        supabase
          .from("open_questions")
          .select("id", { count: "exact", head: true })
          .in("project_id", activeProjectIds)
          .eq("pending", true),
        supabase
          .from("open_questions")
          .select("*")
          .in("project_id", activeProjectIds)
          .eq("pending", true)
          .order("created_at", { ascending: true })
          .limit(TASK_LIST_LIMIT)
          .returns<OpenQuestion[]>(),
      ])
    : [
        { data: [] as Category[] },
        { count: 0 },
        { data: [] as (ClientRequest & { project_id: string })[] },
        { count: 0 },
        { data: [] as OpenQuestion[] },
      ];

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: chosenQuotes } = categoryIds.length
    ? await supabase
        .from("quotes")
        .select("id, category_id, cost_price, status")
        .in("category_id", categoryIds)
        .eq("status", "gekozen")
        .limit(5000)
        .returns<Pick<Quote, "id" | "category_id" | "cost_price" | "status">[]>()
    : { data: [] as Pick<Quote, "id" | "category_id" | "cost_price" | "status">[] };

  // Zelfde optelling als sumCategories() in src/app/projects/[id]/budget/page.tsx: gekozen
  // offerte-kostprijs, anders de handmatige inschatting — hier per project gegroepeerd i.p.v.
  // per categorie-lijst.
  const costPriceByCategory = new Map((chosenQuotes ?? []).map((q) => [q.category_id, q.cost_price]));
  const costByProject = new Map<string, number>();
  for (const category of categories ?? []) {
    const cost = costPriceByCategory.get(category.id) ?? category.manual_cost;
    if (cost === null || cost === undefined) continue;
    costByProject.set(category.project_id, (costByProject.get(category.project_id) ?? 0) + cost);
  }

  const openCategoriesAll = (categories ?? []).filter((c) => OPEN_CATEGORY_STATUSES.includes(c.status));
  const openCategoriesShown = openCategoriesAll.slice(0, TASK_LIST_LIMIT);
  const openCategoriesExtra = openCategoriesAll.length - openCategoriesShown.length;

  const clientRequests = clientRequestRows ?? [];
  const clientRequestsExtra = Math.max(0, (clientRequestCount ?? 0) - clientRequests.length);

  const openQuestions = openQuestionRows ?? [];
  const openQuestionsExtra = Math.max(0, (openQuestionCount ?? 0) - openQuestions.length);

  // "Verstuurd naar klant" heeft geen eigen tijdstempel in het schema — client_password_hash
  // (klant kan inloggen op het portaal) is de beste beschikbare proxy voor "de klant heeft
  // hier daadwerkelijk toegang toe", i.p.v. elk project met de standaardstatus 'pending' mee
  // te tellen (die staat ook op projecten die nog nooit gedeeld zijn).
  const pendingApprovals = activeProjects
    .filter((p) => p.budget_approval_status === "pending" && p.client_password_hash)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pendingApprovalsShown = pendingApprovals.slice(0, TASK_LIST_LIMIT);
  const pendingApprovalsExtra = pendingApprovals.length - pendingApprovalsShown.length;

  const statusCounts = new Map<CategoryStatus, number>();
  for (const category of categories ?? []) {
    statusCounts.set(category.status, (statusCounts.get(category.status) ?? 0) + 1);
  }
  const pieData = (Object.keys(CATEGORY_STATUS_LABELS) as CategoryStatus[])
    .map((status) => ({ status, label: CATEGORY_STATUS_LABELS[status], count: statusCounts.get(status) ?? 0 }))
    .filter((d) => d.count > 0);

  const barProjects = activeProjects.slice(0, PROJECT_CHART_LIMIT);
  const barData = barProjects.map((p) => ({ name: p.name, cost: costByProject.get(p.id) ?? 0 }));
  const barExtra = activeProjects.length - barProjects.length;

  const upcoming = activeProjects
    .filter((p): p is Project & { event_date: string } => Boolean(p.event_date))
    .slice(0, UPCOMING_LIMIT);

  const t = await createTranslator(lang, DASHBOARD_LABELS);

  const openCategoriesItems: TaskItem[] = openCategoriesShown.map((c) => ({
    key: c.id,
    href: `/projects/${c.project_id}/budget`,
    title: c.name,
    subtitle: projectNameById.get(c.project_id),
    badge: t(CATEGORY_STATUS_LABELS[c.status]),
  }));

  const clientRequestItems: TaskItem[] = clientRequests.map((r) => ({
    key: r.id,
    href: `/projects/${r.project_id}`,
    title: t(CLIENT_REQUEST_CATEGORY_LABELS[r.category] ?? r.category) + (r.description ? ` — ${r.description}` : ""),
    subtitle: projectNameById.get(r.project_id),
    badge: t(CLIENT_REQUEST_STATUS_LABELS[r.status] ?? r.status),
  }));

  const openQuestionItems: TaskItem[] = openQuestions.map((q) => ({
    key: q.id,
    href: `/projects/${q.project_id}/production/vragen`,
    title: q.question,
    subtitle: projectNameById.get(q.project_id),
  }));

  const pendingApprovalItems: TaskItem[] = pendingApprovalsShown.map((p) => ({
    key: p.id,
    href: `/projects/${p.id}`,
    title: p.name,
    subtitle: p.client_name || undefined,
    badge: t("In afwachting"),
  }));

  const chartsLabels: DashboardChartsLabels = {
    financialOverview: t("Financieel overzicht"),
    costPerProject: t("Begrote kosten per actief project"),
    noCostData: t("Nog geen begrote kosten om te tonen."),
    categoryStatus: t("Status categorieën (actieve projecten)"),
    noCategoryData: t("Nog geen categorieën om te tonen."),
    upcomingEvents: t("Eerstvolgende events"),
    noUpcomingEvents: t("Nog geen aankomende events."),
    more: t("meer"),
    client: t("Klant:"),
  };

  const upcomingData = upcoming.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.client_name || null,
    dateLabel: formatShortDate(p.event_date),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Dashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Overzicht van openstaande taken en financiën over al je projecten.")}
          </p>
        </div>

        {allProjects.length === 0 ? (
          <p className="text-muted-foreground">
            {t("Nog geen projecten. Maak je eerste project aan om te beginnen met begroten.")}
          </p>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">{t("Open taken")}</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TaskListCard
                  title={t("Categorieën die nog op een leverancier wachten")}
                  items={openCategoriesItems}
                  emptyText={t("Alle categorieën zijn bevestigd, of wachten nog niet op een leverancier.")}
                  extraCount={openCategoriesExtra}
                  moreLabel={t("meer")}
                />
                <TaskListCard
                  title={t("Openstaande klantverzoeken")}
                  items={clientRequestItems}
                  emptyText={t("Geen openstaande klantverzoeken.")}
                  extraCount={clientRequestsExtra}
                  moreLabel={t("meer")}
                />
                <TaskListCard
                  title={t("Onbeantwoorde vragen")}
                  items={openQuestionItems}
                  emptyText={t("Geen onbeantwoorde vragen.")}
                  extraCount={openQuestionsExtra}
                  moreLabel={t("meer")}
                />
                <TaskListCard
                  title={t("Begroting bij klant in afwachting")}
                  items={pendingApprovalItems}
                  emptyText={t("Geen begrotingen in afwachting van een klantreactie.")}
                  extraCount={pendingApprovalsExtra}
                  moreLabel={t("meer")}
                />
              </div>
            </div>

            <DashboardCharts
              barData={barData}
              barExtra={barExtra}
              pieData={pieData}
              upcoming={upcomingData}
              labels={chartsLabels}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
