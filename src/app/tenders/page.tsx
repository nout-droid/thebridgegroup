import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tender, TenderActivity, TenderStage } from "@/lib/types";
import {
  addTenderActivity,
  convertTenderToProject,
  createTender,
  deleteTender,
  deleteTenderActivity,
  updateTender,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const STAGES: TenderStage[] = ["geidentificeerd", "go_no_go", "ingediend", "gewonnen", "verloren"];

const TENDERS_PAGE_LABELS = [
  "Tenders",
  "Aanbestedingen door de pipeline volgen, van eerste signalering tot indiening en gunning.",
  "Openstaande tenders",
  "Totale waarde (openstaand)",
  "Gewonnen (totaal)",
  "Deadlines deze en volgende maand",
  "Nieuwe tender",
  "Titel",
  "Klant/opdrachtgever",
  "Contactpersoon",
  "E-mail",
  "Telefoon",
  "Stadium",
  "Geschatte waarde (€)",
  "Indiendeadline",
  "Besluitdatum",
  "Notities",
  "Tender toevoegen",
  "Geïdentificeerd",
  "Go/no-go",
  "Ingediend",
  "Gewonnen",
  "Verloren",
  "Nog geen tenders in dit stadium.",
  "Opslaan",
  "Tender verwijderen",
  "Interacties",
  "Nog geen interacties gelogd.",
  "Type",
  "Bellen",
  "E-mail",
  "Afspraak",
  "Notitie",
  "Omschrijving",
  "Toevoegen",
  "Verwijderen",
  "Omzetten naar project",
  "Projectnaam",
  "Klantnaam",
  "Evenementdatum",
  "Omzetten",
  "Gekoppeld project",
  "Deadline",
];

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

export default async function TendersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const [{ data: tenders }, lang] = await Promise.all([
    supabase
      .from("tenders")
      .select("*")
      .eq("user_id", ownerId)
      .order("submission_deadline", { ascending: true, nullsFirst: false })
      .returns<Tender[]>(),
    getAppLang(),
  ]);

  const tenderIds = (tenders ?? []).map((t) => t.id);
  const { data: activities } = tenderIds.length
    ? await supabase
        .from("tender_activities")
        .select("*")
        .in("tender_id", tenderIds)
        .order("created_at", { ascending: false })
        .returns<TenderActivity[]>()
    : { data: [] as TenderActivity[] };

  const activitiesByTender = new Map<string, TenderActivity[]>();
  for (const activity of activities ?? []) {
    const list = activitiesByTender.get(activity.tender_id) ?? [];
    list.push(activity);
    activitiesByTender.set(activity.tender_id, list);
  }

  const t = await createTranslator(lang, [...TENDERS_PAGE_LABELS, ...(tenders ?? []).map((tn) => tn.title)]);

  const STAGE_LABELS: Record<TenderStage, string> = {
    geidentificeerd: t("Geïdentificeerd"),
    go_no_go: t("Go/no-go"),
    ingediend: t("Ingediend"),
    gewonnen: t("Gewonnen"),
    verloren: t("Verloren"),
  };

  const openTenders = (tenders ?? []).filter((tn) => tn.stage !== "gewonnen" && tn.stage !== "verloren");
  const openValueTotal = openTenders.reduce((sum, tn) => sum + tn.estimated_value, 0);
  const wonTotal = (tenders ?? [])
    .filter((tn) => tn.stage === "gewonnen")
    .reduce((sum, tn) => sum + tn.estimated_value, 0);

  const now = new Date();
  const twoMonthsOut = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const upcomingDeadlines = openTenders
    .filter((tn) => tn.submission_deadline && new Date(tn.submission_deadline) < twoMonthsOut)
    .sort((a, b) => (a.submission_deadline ?? "").localeCompare(b.submission_deadline ?? ""));

  const tendersByStage = new Map<TenderStage, Tender[]>();
  for (const stage of STAGES) tendersByStage.set(stage, []);
  for (const tender of tenders ?? []) {
    tendersByStage.get(tender.stage)?.push(tender);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Tenders")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Aanbestedingen door de pipeline volgen, van eerste signalering tot indiening en gunning.")}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Openstaande tenders")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{openTenders.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Totale waarde (openstaand)")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{euro(openValueTotal)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Gewonnen (totaal)")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{euro(wonTotal)}</CardContent>
          </Card>
        </div>

        {upcomingDeadlines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Deadlines deze en volgende maand")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {upcomingDeadlines.map((tn) => (
                  <div key={tn.id} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{t(tn.title)}</p>
                    <p className="text-muted-foreground">
                      {t("Deadline")}: {tn.submission_deadline}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuwe tender")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTender} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-title">{t("Titel")}</Label>
                  <Input id="new-title" name="title" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-client">{t("Klant/opdrachtgever")}</Label>
                  <Input id="new-client" name="client_name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-contact">{t("Contactpersoon")}</Label>
                  <Input id="new-contact" name="contact_name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">{t("E-mail")}</Label>
                  <Input id="new-email" name="contact_email" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone">{t("Telefoon")}</Label>
                  <Input id="new-phone" name="contact_phone" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-stage">{t("Stadium")}</Label>
                  <select
                    id="new-stage"
                    name="stage"
                    defaultValue="geidentificeerd"
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-value">{t("Geschatte waarde (€)")}</Label>
                  <Input id="new-value" name="estimated_value" type="number" step="0.01" min="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-deadline">{t("Indiendeadline")}</Label>
                  <Input id="new-deadline" name="submission_deadline" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-decision">{t("Besluitdatum")}</Label>
                  <Input id="new-decision" name="decision_date" type="date" />
                </div>
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
              <Button type="submit">{t("Tender toevoegen")}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {STAGES.map((stage) => {
            const stageTenders = tendersByStage.get(stage) ?? [];
            return (
              <Card key={stage}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {STAGE_LABELS[stage]}
                    <Badge variant="secondary">{stageTenders.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageTenders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("Nog geen tenders in dit stadium.")}</p>
                  ) : (
                    stageTenders.map((tender) => (
                      <details key={tender.id} className="rounded-md border p-2.5">
                        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{t(tender.title)}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {euro(tender.estimated_value)}
                            {tender.submission_deadline ? ` · ${tender.submission_deadline}` : ""}
                          </span>
                        </summary>

                        <div className="mt-3 space-y-4 border-t pt-3">
                          <form action={updateTender.bind(null, tender.id)} className="space-y-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Titel")}</Label>
                                <Input name="title" defaultValue={tender.title} className="h-8 text-xs" required />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Klant/opdrachtgever")}</Label>
                                <Input name="client_name" defaultValue={tender.client_name} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Contactpersoon")}</Label>
                                <Input name="contact_name" defaultValue={tender.contact_name} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("E-mail")}</Label>
                                <Input
                                  name="contact_email"
                                  type="email"
                                  defaultValue={tender.contact_email}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Telefoon")}</Label>
                                <Input name="contact_phone" defaultValue={tender.contact_phone} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Stadium")}</Label>
                                <select
                                  name="stage"
                                  defaultValue={tender.stage}
                                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                >
                                  {STAGES.map((s) => (
                                    <option key={s} value={s}>
                                      {STAGE_LABELS[s]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Geschatte waarde (€)")}</Label>
                                <Input
                                  name="estimated_value"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={tender.estimated_value}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Indiendeadline")}</Label>
                                <Input
                                  name="submission_deadline"
                                  type="date"
                                  defaultValue={tender.submission_deadline ?? ""}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Besluitdatum")}</Label>
                                <Input
                                  name="decision_date"
                                  type="date"
                                  defaultValue={tender.decision_date ?? ""}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("Notities")}</Label>
                              <textarea
                                name="notes"
                                defaultValue={tender.notes}
                                rows={2}
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" className="h-7 text-xs">
                                {t("Opslaan")}
                              </Button>
                            </div>
                          </form>

                          <form action={deleteTender.bind(null, tender.id)}>
                            <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                              {t("Tender verwijderen")}
                            </Button>
                          </form>

                          {tender.stage === "gewonnen" &&
                            (tender.project_id ? (
                              <p className="text-xs">
                                <a
                                  href={`/projects/${tender.project_id}`}
                                  className="font-medium text-primary underline"
                                >
                                  {t("Gekoppeld project")} →
                                </a>
                              </p>
                            ) : (
                              <form
                                action={convertTenderToProject.bind(null, tender.id)}
                                className="space-y-2 rounded-md border p-2.5"
                              >
                                <p className="text-xs font-medium">{t("Omzetten naar project")}</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <Input
                                    name="name"
                                    placeholder={t("Projectnaam")}
                                    defaultValue={tender.title}
                                    className="h-8 text-xs"
                                    required
                                  />
                                  <Input
                                    name="client_name"
                                    placeholder={t("Klantnaam")}
                                    defaultValue={tender.client_name}
                                    className="h-8 text-xs"
                                  />
                                  <Input name="event_date" type="date" className="h-8 text-xs" />
                                </div>
                                <Button type="submit" size="sm" className="h-7 text-xs">
                                  {t("Omzetten")}
                                </Button>
                              </form>
                            ))}

                          <div className="space-y-2">
                            <p className="text-xs font-medium">{t("Interacties")}</p>
                            <form
                              action={addTenderActivity.bind(null, tender.id)}
                              className="flex items-end gap-1.5"
                            >
                              <select
                                name="activity_type"
                                defaultValue="note"
                                className="h-8 rounded-md border bg-background px-1.5 text-xs"
                              >
                                <option value="call">{t("Bellen")}</option>
                                <option value="email">{t("E-mail")}</option>
                                <option value="meeting">{t("Afspraak")}</option>
                                <option value="note">{t("Notitie")}</option>
                              </select>
                              <Input
                                name="description"
                                placeholder={t("Omschrijving")}
                                className="h-8 flex-1 text-xs"
                                required
                              />
                              <Button type="submit" size="sm" className="h-8 text-xs">
                                {t("Toevoegen")}
                              </Button>
                            </form>
                            {(activitiesByTender.get(tender.id) ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">{t("Nog geen interacties gelogd.")}</p>
                            ) : (
                              <ul className="space-y-1">
                                {(activitiesByTender.get(tender.id) ?? []).map((activity) => (
                                  <li
                                    key={activity.id}
                                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                                  >
                                    <span>
                                      <Badge variant="outline" className="mr-1.5 text-[10px]">
                                        {activity.activity_type}
                                      </Badge>
                                      {activity.description}
                                    </span>
                                    <form action={deleteTenderActivity.bind(null, activity.id)}>
                                      <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                                        {t("Verwijderen")}
                                      </Button>
                                    </form>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </details>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
