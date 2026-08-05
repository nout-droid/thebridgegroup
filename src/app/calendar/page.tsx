import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";
import { getTeamOwnerId } from "@/lib/server/team";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const CALENDAR_PAGE_LABELS = [
  "Kalender",
  "Alle projecten in één overzicht, gegroepeerd per maand — zo zie je in één oogopslag welke events overlappen of eraan komen.",
  "Nog geen projecten met een datum.",
  "Klant:",
  "Overlapt met:",
  "Zonder datum",
];

interface ProjectWindow {
  start: string;
  end: string;
}

// De bezettingsperiode van een project: vanaf opbouw tot einde afbraak, met terugval op de
// show-periode en tot slot de enkele event_date voor oudere projecten zonder datumbereik.
// Zelfde logica als occupationWindow() in src/lib/server/supplier-conflicts.ts, hier lokaal
// gehouden omdat die functie daar niet geëxporteerd wordt.
function occupationWindow(project: Project): ProjectWindow | null {
  const start = project.build_start_date ?? project.show_start_date ?? project.event_date;
  const end = project.strike_end_date ?? project.show_end_date ?? project.event_date;
  if (!start || !end) return null;
  return { start, end };
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(window: ProjectWindow): string {
  if (window.start === window.end) return formatDate(window.start);
  return `${formatDate(window.start)} – ${formatDate(window.end)}`;
}

function monthHeading(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = date.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  // Deze queries hebben alleen `ownerId` nodig (geen onderlinge afhankelijkheid) — in één
  // keer parallel opvragen i.p.v. na elkaar.
  const [{ data: projects }, lang] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", ownerId)
      .order("event_date", { ascending: true })
      .returns<Project[]>(),
    getAppLang(),
  ]);

  const projectsWithWindow = (projects ?? []).map((project) => ({
    project,
    window: occupationWindow(project),
  }));

  // Simpele "botst dit met een ander event"-check over alle opgehaalde projecten: dezelfde
  // datumbereik-overlap als in supplier-conflicts.ts, maar dan op projectniveau i.p.v. per
  // leverancier.
  const overlapsByProjectId = new Map<string, string[]>();
  for (let i = 0; i < projectsWithWindow.length; i++) {
    const a = projectsWithWindow[i];
    if (!a.window) continue;
    for (let j = i + 1; j < projectsWithWindow.length; j++) {
      const b = projectsWithWindow[j];
      if (!b.window) continue;
      if (!rangesOverlap(a.window.start, a.window.end, b.window.start, b.window.end)) continue;

      overlapsByProjectId.set(a.project.id, [
        ...(overlapsByProjectId.get(a.project.id) ?? []),
        b.project.name,
      ]);
      overlapsByProjectId.set(b.project.id, [
        ...(overlapsByProjectId.get(b.project.id) ?? []),
        a.project.name,
      ]);
    }
  }

  const withDate = projectsWithWindow
    .filter((item): item is { project: Project; window: ProjectWindow } => item.window !== null)
    .sort((a, b) => a.window.start.localeCompare(b.window.start));
  const withoutDate = projectsWithWindow.filter((item) => item.window === null);

  const groups = new Map<string, { project: Project; window: ProjectWindow }[]>();
  for (const item of withDate) {
    const monthKey = item.window.start.slice(0, 7);
    const list = groups.get(monthKey) ?? [];
    list.push(item);
    groups.set(monthKey, list);
  }
  const sortedMonthKeys = [...groups.keys()].sort();
  const monthHeadings = sortedMonthKeys.map(monthHeading);

  const t = await createTranslator(lang, [
    ...CALENDAR_PAGE_LABELS,
    ...monthHeadings,
    ...(projects ?? []).map((p) => p.status),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
            {t("Kalender")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Alle projecten in één overzicht, gegroepeerd per maand — zo zie je in één oogopslag welke events overlappen of eraan komen."
            )}
          </p>
        </div>

        {!projects?.length ? (
          <p className="text-muted-foreground">{t("Nog geen projecten met een datum.")}</p>
        ) : (
          <div className="space-y-8">
            {sortedMonthKeys.map((monthKey) => (
              <div key={monthKey} className="space-y-3">
                <h2 className="font-heading text-lg font-bold uppercase tracking-tight">
                  {t(monthHeading(monthKey))}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.get(monthKey)!.map(({ project, window }) => {
                    const overlaps = overlapsByProjectId.get(project.id);
                    return (
                      <Card
                        key={project.id}
                        className="h-full transition-colors hover:border-foreground/30"
                      >
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
                            <p>{formatDateRange(window)}</p>
                            {overlaps?.length ? (
                              <Badge variant="destructive" className="mt-1">
                                {t("Overlapt met:")} {overlaps.join(", ")}
                              </Badge>
                            ) : null}
                          </CardContent>
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {withoutDate.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-lg font-bold uppercase tracking-tight">
                  {t("Zonder datum")}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {withoutDate.map(({ project }) => (
                    <Card
                      key={project.id}
                      className="h-full transition-colors hover:border-foreground/30"
                    >
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
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
