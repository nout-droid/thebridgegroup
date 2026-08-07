import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, EVENT_TYPES, type Project } from "@/lib/types";
import { getTeamOwnerId } from "@/lib/server/team";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const CALENDAR_PAGE_LABELS = [
  "Kalender",
  "Alle projecten in één overzicht — zo zie je in één oogopslag welke events overlappen, hoe lang de pre-productie loopt en wat voor type event het is.",
  "Nog geen projecten met een datum.",
  "Klant:",
  "Overlapt met:",
  "Zonder datum",
  "Jaar",
  "Maand",
  "Week",
  "Vandaag",
  "Vorige",
  "Volgende",
  "Pre-productie",
  "Op-/afbouw en show",
  "meer",
];

interface ProjectWindow {
  start: string;
  end: string;
  preProdStart: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// De bezettingsperiode van een project: vanaf opbouw tot einde afbraak, met terugval op de
// show-periode en tot slot de enkele event_date voor oudere projecten zonder datumbereik.
// preProdStart schuift daarvoor terug op basis van pre_production_weeks, zodat de kalender
// ook laat zien hoe lang de voorbereiding normaal loopt — niet alleen de fysieke bezetting.
function occupationWindow(project: Project): ProjectWindow | null {
  const start = project.build_start_date ?? project.show_start_date ?? project.event_date;
  const end = project.strike_end_date ?? project.show_end_date ?? project.event_date;
  if (!start || !end) return null;
  const preProdWeeks = project.pre_production_weeks ?? 0;
  const preProdStart = preProdWeeks > 0 ? addDaysToDateStr(start, -preProdWeeks * 7) : start;
  return { start, end, preProdStart };
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function dayState(day: string, window: ProjectWindow): "event" | "preprod" | "none" {
  if (day >= window.start && day <= window.end) return "event";
  if (window.preProdStart < window.start && day >= window.preProdStart && day < window.start) return "preprod";
  return "none";
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function monthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = date.toLocaleDateString("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Maandag als eerste dag van de week (nl-NL-conventie), zodat de maand-/weekgrid aansluit bij
// hoe Nederlandse gebruikers een agenda gewend zijn te lezen.
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAY_LABELS_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

type ViewMode = "year" | "month" | "week";
type WindowedProject = { project: Project; window: ProjectWindow };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; year?: string; month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const [{ data: projects }, lang] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", ownerId)
      .order("event_date", { ascending: true })
      .returns<Project[]>(),
    getAppLang(),
  ]);

  const today = todayStr();
  const view: ViewMode = params.view === "month" || params.view === "week" ? params.view : "year";
  const year = Number(params.year) || Number(today.slice(0, 4));
  const month = Math.min(12, Math.max(1, Number(params.month) || Number(today.slice(5, 7))));
  const anchorDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;

  const projectsWithWindow: WindowedProject[] = (projects ?? [])
    .map((project) => ({ project, window: occupationWindow(project) }))
    .filter((item): item is WindowedProject => item.window !== null);
  const withoutDate = (projects ?? []).filter((p) => occupationWindow(p) === null);

  // Botst-dit-met-een-ander-event-check over de fysieke bezettingsperiode (op-/afbouw t/m
  // strike) — pre-productie zelf gebeurt doorgaans niet op locatie, dus die telt hier niet mee.
  const overlapsByProjectId = new Map<string, string[]>();
  for (let i = 0; i < projectsWithWindow.length; i++) {
    const a = projectsWithWindow[i];
    for (let j = i + 1; j < projectsWithWindow.length; j++) {
      const b = projectsWithWindow[j];
      if (!rangesOverlap(a.window.start, a.window.end, b.window.start, b.window.end)) continue;
      overlapsByProjectId.set(a.project.id, [...(overlapsByProjectId.get(a.project.id) ?? []), b.project.name]);
      overlapsByProjectId.set(b.project.id, [...(overlapsByProjectId.get(b.project.id) ?? []), a.project.name]);
    }
  }

  const monthHeadings = Array.from({ length: 12 }, (_, i) => monthLabel(year, i + 1));
  const currentMonthLabel = monthLabel(year, month);

  const t = await createTranslator(lang, [
    ...CALENDAR_PAGE_LABELS,
    ...Object.values(EVENT_TYPE_LABELS),
    ...monthHeadings,
    currentMonthLabel,
    ...(projects ?? []).map((p) => p.status),
  ]);

  function href(overrides: Partial<{ view: ViewMode; year: number; month: number; date: string }>) {
    const next = { view, year, month, date: anchorDate, ...overrides };
    const qs = new URLSearchParams();
    qs.set("view", next.view);
    if (next.view === "year") qs.set("year", String(next.year));
    if (next.view === "month") {
      qs.set("year", String(next.year));
      qs.set("month", String(next.month));
    }
    if (next.view === "week") qs.set("date", next.date);
    return `/calendar?${qs.toString()}`;
  }

  function ViewTabs() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {(["year", "month", "week"] as ViewMode[]).map((v) => (
          <Link
            key={v}
            href={href({ view: v })}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              view === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {t(v === "year" ? "Jaar" : v === "month" ? "Maand" : "Week")}
          </Link>
        ))}
        <Link href={href({ view: "week", date: today })} className="text-sm text-primary underline">
          {t("Vandaag")}
        </Link>
      </div>
    );
  }

  function Legend() {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {EVENT_TYPES.map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
            {t(EVENT_TYPE_LABELS[type])}
          </span>
        ))}
      </div>
    );
  }

  // ---- Jaarweergave: per project één rij, 12 maandkolommen, kleur = event_type ----
  function YearView() {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const rows = projectsWithWindow
      .filter((item) => rangesOverlap(item.window.preProdStart, item.window.end, yearStart, yearEnd))
      .sort((a, b) => a.window.preProdStart.localeCompare(b.window.preProdStart));

    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Link href={href({ year: year - 1 })} className="text-sm text-primary underline">
              ← {year - 1}
            </Link>
            <span className="font-heading text-lg font-bold">{year}</span>
            <Link href={href({ year: year + 1 })} className="text-sm text-primary underline">
              {year + 1} →
            </Link>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nog geen projecten met een datum.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="w-48 min-w-[10rem] pb-2 text-left font-medium text-muted-foreground">
                      {/* projectnaam-kolom */}
                    </th>
                    {monthHeadings.map((label, i) => (
                      <th key={i} className="pb-2 text-center font-medium text-muted-foreground">
                        {t(label).slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ project, window }) => {
                    const overlaps = overlapsByProjectId.get(project.id);
                    const color = EVENT_TYPE_COLORS[project.event_type] ?? EVENT_TYPE_COLORS.other;
                    return (
                      <tr key={project.id} className="border-t">
                        <td className="py-1.5 pr-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium hover:underline"
                            title={overlaps?.length ? `${t("Overlapt met:")} ${overlaps.join(", ")}` : undefined}
                          >
                            {project.name}
                          </Link>
                          {project.client_name && (
                            <span className="block text-muted-foreground">{project.client_name}</span>
                          )}
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                          const { start: mStart, end: mEnd } = monthBounds(year, m);
                          const isEvent = rangesOverlap(window.start, window.end, mStart, mEnd);
                          const isPreprod =
                            !isEvent &&
                            window.preProdStart < window.start &&
                            rangesOverlap(window.preProdStart, addDaysToDateStr(window.start, -1), mStart, mEnd);
                          return (
                            <td key={m} className="px-0.5 py-1.5">
                              <div
                                className={`h-4 rounded-sm ${overlaps?.length && isEvent ? "ring-2 ring-destructive" : ""}`}
                                style={{
                                  backgroundColor: isEvent || isPreprod ? color : "transparent",
                                  opacity: isEvent ? 1 : isPreprod ? 0.35 : 1,
                                  border: isEvent || isPreprod ? "none" : "1px dashed var(--border)",
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-4 rounded-sm bg-foreground/35" />
              {t("Pre-productie")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-4 rounded-sm bg-foreground" />
              {t("Op-/afbouw en show")}
            </span>
          </div>
          <Legend />
        </CardContent>
      </Card>
    );
  }

  // ---- Maandweergave: dagraster met gekleurde chips ----
  function MonthView() {
    const { start: mStart, end: mEnd } = monthBounds(year, month);
    const gridStart = mondayOf(mStart);
    const lastDayMonday = mondayOf(mEnd);
    const gridEnd = addDaysToDateStr(lastDayMonday, 6);
    const days: string[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDaysToDateStr(d, 1)) days.push(d);

    const relevant = projectsWithWindow.filter((item) =>
      rangesOverlap(item.window.preProdStart, item.window.end, gridStart, gridEnd)
    );

    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Link
              href={href({ year: month === 1 ? year - 1 : year, month: month === 1 ? 12 : month - 1 })}
              className="text-sm text-primary underline"
            >
              ← {t("Vorige")}
            </Link>
            <span className="font-heading text-lg font-bold">{t(currentMonthLabel)}</span>
            <Link
              href={href({ year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1 })}
              className="text-sm text-primary underline"
            >
              {t("Volgende")} →
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {WEEKDAY_LABELS_NL.map((d) => (
              <div key={d} className="pb-1 text-center font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const inMonth = day >= mStart && day <= mEnd;
              const dayItems = relevant
                .map((item) => ({ ...item, state: dayState(day, item.window) }))
                .filter((item) => item.state !== "none");
              const visible = dayItems.slice(0, 3);
              const extra = dayItems.length - visible.length;
              return (
                <div
                  key={day}
                  className={`min-h-20 rounded-md border p-1 ${inMonth ? "" : "opacity-40"} ${
                    day === today ? "border-primary" : ""
                  }`}
                >
                  <div className="text-right text-[10px] text-muted-foreground">{Number(day.slice(8, 10))}</div>
                  <div className="space-y-0.5">
                    {visible.map(({ project, state }) => {
                      const color = EVENT_TYPE_COLORS[project.event_type] ?? EVENT_TYPE_COLORS.other;
                      const overlaps = overlapsByProjectId.get(project.id);
                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className={`block truncate rounded px-1 text-[10px] leading-4 ${
                            overlaps?.length && state === "event" ? "ring-1 ring-destructive" : ""
                          }`}
                          style={
                            state === "event"
                              ? { backgroundColor: color, color: "#fff" }
                              : { backgroundColor: `${color}26`, color, border: `1px dashed ${color}` }
                          }
                          title={project.name}
                        >
                          {project.name}
                        </Link>
                      );
                    })}
                    {extra > 0 && (
                      <Link
                        href={href({ view: "week", date: day })}
                        className="block text-[10px] text-muted-foreground hover:underline"
                      >
                        +{extra} {t("meer")}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Legend />
        </CardContent>
      </Card>
    );
  }

  // ---- Weekweergave: 7 dagen, volledige lijst per dag ----
  function WeekView() {
    const weekStart = mondayOf(anchorDate);
    const weekEnd = addDaysToDateStr(weekStart, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDaysToDateStr(weekStart, i));
    const relevant = projectsWithWindow.filter((item) =>
      rangesOverlap(item.window.preProdStart, item.window.end, weekStart, weekEnd)
    );

    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Link href={href({ date: addDaysToDateStr(weekStart, -7) })} className="text-sm text-primary underline">
              ← {t("Vorige")}
            </Link>
            <span className="font-heading text-lg font-bold">
              {formatDate(weekStart)} – {formatDate(weekEnd)}
            </span>
            <Link href={href({ date: addDaysToDateStr(weekStart, 7) })} className="text-sm text-primary underline">
              {t("Volgende")} →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((day, i) => {
              const dayItems = relevant
                .map((item) => ({ ...item, state: dayState(day, item.window) }))
                .filter((item) => item.state !== "none");
              return (
                <div key={day} className={`rounded-md border p-2 ${day === today ? "border-primary" : ""}`}>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {WEEKDAY_LABELS_NL[i]} {Number(day.slice(8, 10))}/{Number(day.slice(5, 7))}
                  </p>
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {dayItems.map(({ project, state }) => {
                        const color = EVENT_TYPE_COLORS[project.event_type] ?? EVENT_TYPE_COLORS.other;
                        return (
                          <li key={project.id}>
                            <Link
                              href={`/projects/${project.id}`}
                              className="flex items-start gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-accent"
                              style={
                                state === "event"
                                  ? { backgroundColor: `${color}26`, borderLeft: `3px solid ${color}` }
                                  : { borderLeft: `3px dashed ${color}` }
                              }
                            >
                              <span>
                                <span className="font-medium">{project.name}</span>
                                {project.client_name && (
                                  <span className="text-muted-foreground"> — {project.client_name}</span>
                                )}
                                {state === "preprod" && (
                                  <span className="ml-1 text-muted-foreground">({t("Pre-productie")})</span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <Legend />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Kalender")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Alle projecten in één overzicht — zo zie je in één oogopslag welke events overlappen, hoe lang de pre-productie loopt en wat voor type event het is."
              )}
            </p>
          </div>
          <ViewTabs />
        </div>

        {!projects?.length ? (
          <p className="text-muted-foreground">{t("Nog geen projecten met een datum.")}</p>
        ) : (
          <>
            {view === "year" && <YearView />}
            {view === "month" && <MonthView />}
            {view === "week" && <WeekView />}
          </>
        )}

        {withoutDate.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-bold uppercase tracking-tight">{t("Zonder datum")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {withoutDate.map((project) => (
                <Card key={project.id} className="h-full transition-colors hover:border-foreground/30">
                  <Link href={`/projects/${project.id}`} className="block">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <Badge variant="secondary">{t(project.status)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {project.client_name && (
                        <p>
                          {t("Klant:")} {project.client_name}
                        </p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
