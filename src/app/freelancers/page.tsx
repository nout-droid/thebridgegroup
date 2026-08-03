import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccessDatesInput } from "@/components/access-dates-input";
import { FreelancerSearch, type FreelancerRow } from "./freelancer-search";
import { getTeamOwnerId } from "@/lib/server/team";
import type { Freelancer, FreelancerAvailability } from "@/lib/types";
import {
  addAvailability,
  assignFreelancerToProject,
  createFreelancer,
  deleteAvailability,
  deleteFreelancer,
  updateFreelancer,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const FREELANCERS_PAGE_LABELS = [
  "Crew-database",
  "Eén centrale lijst met crew, los van specifieke projecten: standaardtarieven, woonadres en beschikbaarheid, die je direct kunt toewijzen aan een project.",
  "Nieuw crewlid",
  "Naam",
  "Functie",
  "E-mail",
  "Telefoon",
  "Woonadres",
  "Dagtarief (€)",
  "Overurentarief (€/uur)",
  "KM-tarief (€/km)",
  "Skills (komma-gescheiden)",
  "Bv. FOH, monitoren, rigging",
  "Notities",
  "Crewlid toevoegen",
  "Nog geen crewleden in de database.",
  "Opslaan",
  "Verwijderen",
  "Beschikbaarheid",
  "Nog geen periodes geregistreerd.",
  "Status",
  "Beschikbaar",
  "Niet beschikbaar",
  "Vanaf",
  "Tot en met",
  "Opmerking",
  "Toevoegen",
  "Toewijzen aan project",
  "Project",
  "Kies project",
  "Toegangsdagen",
  "Toewijzen",
  "Eerder gebruikte crew",
  "Alle crew die ooit is toegevoegd, over al je projecten heen — doorzoekbaar op naam, functie of skill, zodat je snel iemand terugvindt die je eerder hebt ingezet.",
  "Zoek op naam, functie of skill…",
  "Project",
  "Geen resultaten.",
  "Openstaande functies",
  "Posities die wij zelf leveren maar nog niet (volledig) bij naam zijn ingevuld, over al je projecten heen — zo zie je in één overzicht waar nog crew nodig is.",
  "Nergens openstaande functies.",
  "nog in te vullen",
  "van de",
  "Naar planning",
  "Algemeen",
];

interface CrewRow {
  id: string;
  name: string;
  role: string;
  skills: string[];
  project: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface OpenPositionRow {
  id: string;
  project_id: string;
  work_date: string;
  role: string;
  quantity: number;
  stage: { name: string } | { name: string }[] | null;
}

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

export default async function FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const [{ data: freelancers }, { data: projects }, { data: crew }, lang] = await Promise.all([
    supabase
      .from("freelancers")
      .select("*")
      .eq("user_id", ownerId)
      .order("name", { ascending: true })
      .returns<Freelancer[]>(),
    supabase.from("projects").select("id, name").eq("user_id", ownerId).order("name", { ascending: true }).returns<
      { id: string; name: string }[]
    >(),
    supabase
      .from("crew_members")
      .select("id, name, role, skills, project:projects(id, name)")
      .neq("name", "")
      .order("name", { ascending: true })
      .returns<CrewRow[]>(),
    getAppLang(),
  ]);

  const freelancerIds = (freelancers ?? []).map((f) => f.id);
  const { data: availability } = freelancerIds.length
    ? await supabase
        .from("freelancer_availability")
        .select("*")
        .in("freelancer_id", freelancerIds)
        .order("start_date", { ascending: true })
        .returns<FreelancerAvailability[]>()
    : { data: [] as FreelancerAvailability[] };

  const availabilityByFreelancer = new Map<string, FreelancerAvailability[]>();
  for (const period of availability ?? []) {
    const list = availabilityByFreelancer.get(period.freelancer_id) ?? [];
    list.push(period);
    availabilityByFreelancer.set(period.freelancer_id, list);
  }

  // Openstaande functies over alle projecten heen: posities die wij zelf leveren
  // (provided_by = "wij") waarvan nog niet alle plekken bij naam zijn ingevuld — zelfde
  // "gevuld"-definitie als de Planning-tab per project (crew-planning-card.tsx): crew_members
  // gekoppeld via crew_position_id met een niet-lege naam.
  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: openPositionsRaw } = projectIds.length
    ? await supabase
        .from("crew_positions")
        .select("id, project_id, work_date, role, quantity, stage:stages(name)")
        .in("project_id", projectIds)
        .eq("provided_by", "wij")
        .order("work_date", { ascending: true })
        .returns<OpenPositionRow[]>()
    : { data: [] as OpenPositionRow[] };

  const positionIds = (openPositionsRaw ?? []).map((p) => p.id);
  const { data: linkedMembers } = positionIds.length
    ? await supabase
        .from("crew_members")
        .select("crew_position_id, name")
        .in("crew_position_id", positionIds)
        .returns<{ crew_position_id: string; name: string }[]>()
    : { data: [] as { crew_position_id: string; name: string }[] };

  const filledByPosition = new Map<string, number>();
  for (const m of linkedMembers ?? []) {
    if (!m.name) continue;
    filledByPosition.set(m.crew_position_id, (filledByPosition.get(m.crew_position_id) ?? 0) + 1);
  }

  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const openPositions = (openPositionsRaw ?? [])
    .map((p) => {
      const filled = filledByPosition.get(p.id) ?? 0;
      const stage = Array.isArray(p.stage) ? p.stage[0] : p.stage;
      return {
        id: p.id,
        projectId: p.project_id,
        projectName: projectNameById.get(p.project_id) ?? "",
        workDate: p.work_date,
        role: p.role,
        stageName: stage?.name ?? null,
        quantity: p.quantity,
        filled,
        open: p.quantity - filled,
      };
    })
    .filter((p) => p.open > 0);

  const openPositionsByProject = new Map<string, typeof openPositions>();
  for (const p of openPositions) {
    const list = openPositionsByProject.get(p.projectId) ?? [];
    list.push(p);
    openPositionsByProject.set(p.projectId, list);
  }

  // Gemiddelde beoordeling per functie, over alle projecten heen — ingevuld op de
  // evaluatiepagina per project (zie src/app/projects/[id]/crew-rating-actions.ts). Per rol
  // apart gehouden omdat iemand op het ene project als rigger en op het andere als chauffeur
  // kan werken, met een ander beoordelingsniveau.
  const { data: crewRatings } = freelancerIds.length
    ? await supabase
        .from("crew_ratings")
        .select("freelancer_id, role, rating")
        .in("freelancer_id", freelancerIds)
        .returns<{ freelancer_id: string; role: string; rating: number }[]>()
    : { data: [] as { freelancer_id: string; role: string; rating: number }[] };

  const ratingsByFreelancer = new Map<string, Map<string, number[]>>();
  for (const r of crewRatings ?? []) {
    const byRole = ratingsByFreelancer.get(r.freelancer_id) ?? new Map<string, number[]>();
    const list = byRole.get(r.role) ?? [];
    list.push(r.rating);
    byRole.set(r.role, list);
    ratingsByFreelancer.set(r.freelancer_id, byRole);
  }
  const ratingSummaryByFreelancer = new Map<string, { role: string; avg: number; count: number }[]>();
  for (const [freelancerId, byRole] of ratingsByFreelancer) {
    const summary = [...byRole.entries()].map(([role, list]) => ({
      role,
      avg: list.reduce((sum, n) => sum + n, 0) / list.length,
      count: list.length,
    }));
    ratingSummaryByFreelancer.set(freelancerId, summary);
  }

  const t = await createTranslator(lang, [
    ...FREELANCERS_PAGE_LABELS,
    ...(freelancers ?? []).map((f) => f.name),
    ...(projects ?? []).map((p) => p.name),
    ...[...ratingsByFreelancer.values()].flatMap((byRole) => [...byRole.keys()]),
    ...openPositions.map((p) => p.role),
    ...openPositions.flatMap((p) => (p.stageName ? [p.stageName] : [])),
  ]);

  const rows: FreelancerRow[] = (crew ?? []).map((c) => {
    const project = Array.isArray(c.project) ? c.project[0] : c.project;
    return {
      id: c.id,
      name: c.name,
      role: c.role,
      skills: c.skills,
      projectId: project?.id ?? "",
      projectName: project?.name ?? "",
    };
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          {t("Crew-database")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Eén centrale lijst met crew, los van specifieke projecten: standaardtarieven, woonadres en beschikbaarheid, die je direct kunt toewijzen aan een project."
          )}
        </p>

        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Openstaande functies")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Posities die wij zelf leveren maar nog niet (volledig) bij naam zijn ingevuld, over al je projecten heen — zo zie je in één overzicht waar nog crew nodig is."
              )}
            </p>
          </CardHeader>
          <CardContent>
            {openPositions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nergens openstaande functies.")}</p>
            ) : (
              <div className="space-y-4">
                {[...openPositionsByProject.entries()].map(([projectId, positions]) => (
                  <div key={projectId} className="space-y-1.5">
                    <p className="text-sm font-semibold">{t(projectNameById.get(projectId) ?? "")}</p>
                    <ul className="space-y-1">
                      {positions.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
                        >
                          <span>
                            <span className="font-medium">{t(p.role) || t("Functie")}</span>
                            {" — "}
                            {p.workDate}
                            <span className="text-muted-foreground"> · {p.stageName ? t(p.stageName) : t("Algemeen")}</span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {p.open} {t("nog in te vullen")} ({p.filled} {t("van de")} {p.quantity})
                            </span>
                          </span>
                          <a
                            href={`/projects/${p.projectId}/production/planning`}
                            className="text-xs font-medium text-primary underline"
                          >
                            {t("Naar planning")}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuw crewlid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFreelancer} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">{t("Naam")}</Label>
                  <Input id="new-name" name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-role">{t("Functie")}</Label>
                  <Input id="new-role" name="role" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">{t("E-mail")}</Label>
                  <Input id="new-email" name="email" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone">{t("Telefoon")}</Label>
                  <Input id="new-phone" name="phone" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="new-address">{t("Woonadres")}</Label>
                  <Input id="new-address" name="home_address" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-day-rate">{t("Dagtarief (€)")}</Label>
                  <Input id="new-day-rate" name="day_rate" type="number" step="0.01" min="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-ot-rate">{t("Overurentarief (€/uur)")}</Label>
                  <Input id="new-ot-rate" name="overtime_rate" type="number" step="0.01" min="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-km-rate">{t("KM-tarief (€/km)")}</Label>
                  <Input id="new-km-rate" name="km_rate" type="number" step="0.01" min="0" defaultValue={0.23} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-skills">{t("Skills (komma-gescheiden)")}</Label>
                <Input id="new-skills" name="skills" placeholder={t("Bv. FOH, monitoren, rigging")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-notes">{t("Notities")}</Label>
                <textarea
                  id="new-notes"
                  name="notes"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit">{t("Crewlid toevoegen")}</Button>
            </form>
          </CardContent>
        </Card>

        {!freelancers?.length ? (
          <p className="text-sm text-muted-foreground">{t("Nog geen crewleden in de database.")}</p>
        ) : (
          <div className="space-y-3">
            {freelancers.map((freelancer) => {
              const periods = availabilityByFreelancer.get(freelancer.id) ?? [];
              const ratingSummary = ratingSummaryByFreelancer.get(freelancer.id) ?? [];
              return (
                <details key={freelancer.id} className="rounded-md border p-3">
                  <summary className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="font-medium">
                      {t(freelancer.name)}{" "}
                      <span className="font-normal text-muted-foreground">({freelancer.role})</span>
                    </span>
                    <Badge variant="secondary">{euro(freelancer.day_rate)}/dag</Badge>
                  </summary>

                  {ratingSummary.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {ratingSummary.map(({ role, avg, count }) => (
                        <span key={role}>
                          {t(role) || t("Functie")}: ★ {avg.toFixed(1)} ({count})
                        </span>
                      ))}
                    </p>
                  )}

                  <div className="mt-3 space-y-4 border-t pt-3">
                    <form action={updateFreelancer.bind(null, freelancer.id)} className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Naam")}</Label>
                          <Input name="name" defaultValue={freelancer.name} className="h-8 text-xs" required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Functie")}</Label>
                          <Input name="role" defaultValue={freelancer.role} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("E-mail")}</Label>
                          <Input name="email" type="email" defaultValue={freelancer.email} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Telefoon")}</Label>
                          <Input name="phone" defaultValue={freelancer.phone} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">{t("Woonadres")}</Label>
                          <Input name="home_address" defaultValue={freelancer.home_address} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Dagtarief (€)")}</Label>
                          <Input
                            name="day_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={freelancer.day_rate}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Overurentarief (€/uur)")}</Label>
                          <Input
                            name="overtime_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={freelancer.overtime_rate}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("KM-tarief (€/km)")}</Label>
                          <Input
                            name="km_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={freelancer.km_rate}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("Skills (komma-gescheiden)")}</Label>
                        <Input name="skills" defaultValue={freelancer.skills.join(", ")} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("Notities")}</Label>
                        <textarea
                          name="notes"
                          defaultValue={freelancer.notes}
                          rows={2}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                        />
                      </div>
                      <Button type="submit" size="sm" className="h-7 text-xs">
                        {t("Opslaan")}
                      </Button>
                    </form>

                    <form action={deleteFreelancer.bind(null, freelancer.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                        {t("Verwijderen")}
                      </Button>
                    </form>

                    <div className="space-y-2 rounded-md border p-2.5">
                      <p className="text-xs font-medium">{t("Beschikbaarheid")}</p>
                      {periods.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("Nog geen periodes geregistreerd.")}</p>
                      ) : (
                        <ul className="space-y-1">
                          {periods.map((period) => (
                            <li
                              key={period.id}
                              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                            >
                              <span>
                                <Badge
                                  variant={period.status === "available" ? "secondary" : "outline"}
                                  className="mr-1.5 text-[10px]"
                                >
                                  {period.status === "available" ? t("Beschikbaar") : t("Niet beschikbaar")}
                                </Badge>
                                {period.start_date} — {period.end_date}
                                {period.note && <span className="text-muted-foreground"> · {period.note}</span>}
                              </span>
                              <form action={deleteAvailability.bind(null, period.id)}>
                                <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                                  {t("Verwijderen")}
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form
                        action={addAvailability.bind(null, freelancer.id)}
                        className="grid grid-cols-2 gap-1.5 sm:grid-cols-5"
                      >
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Vanaf")}</Label>
                          <Input name="start_date" type="date" required className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Tot en met")}</Label>
                          <Input name="end_date" type="date" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Status")}</Label>
                          <select
                            name="status"
                            defaultValue="unavailable"
                            className="h-8 w-full rounded-md border bg-background px-1.5 text-xs"
                          >
                            <option value="unavailable">{t("Niet beschikbaar")}</option>
                            <option value="available">{t("Beschikbaar")}</option>
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-1">
                          <Label className="text-[10px]">{t("Opmerking")}</Label>
                          <Input name="note" className="h-8 text-xs" />
                        </div>
                        <Button type="submit" size="sm" className="h-8 self-end text-xs">
                          {t("Toevoegen")}
                        </Button>
                      </form>
                    </div>

                    <form
                      action={assignFreelancerToProject.bind(null, freelancer.id)}
                      className="space-y-2 rounded-md border p-2.5"
                    >
                      <p className="text-xs font-medium">{t("Toewijzen aan project")}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Project")}</Label>
                          <select
                            name="project_id"
                            required
                            defaultValue=""
                            className="h-8 w-full rounded-md border bg-background px-1.5 text-xs"
                          >
                            <option value="" disabled>
                              {t("Kies project")}
                            </option>
                            {(projects ?? []).map((project) => (
                              <option key={project.id} value={project.id}>
                                {t(project.name)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Functie")}</Label>
                          <Input name="role" defaultValue={freelancer.role} className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">{t("Toegangsdagen")}</Label>
                        <AccessDatesInput />
                      </div>
                      <Button type="submit" size="sm" className="h-7 text-xs">
                        {t("Toewijzen")}
                      </Button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Eerder gebruikte crew")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Alle crew die ooit is toegevoegd, over al je projecten heen — doorzoekbaar op naam, functie of skill, zodat je snel iemand terugvindt die je eerder hebt ingezet."
              )}
            </p>
          </CardHeader>
          <CardContent>
            <FreelancerSearch
              rows={rows}
              labels={{
                placeholder: t("Zoek op naam, functie of skill…"),
                name: t("Naam"),
                role: t("Functie"),
                project: t("Project"),
                empty: t("Geen resultaten."),
              }}
            />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
