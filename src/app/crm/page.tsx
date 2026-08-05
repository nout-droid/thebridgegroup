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
import type { SalesLead, SalesLeadActivity, SalesLeadStage } from "@/lib/types";
import {
  addLeadActivity,
  convertLeadToProject,
  createLead,
  deleteLead,
  deleteLeadActivity,
  updateLead,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const STAGES: SalesLeadStage[] = ["lead", "contacted", "proposal", "quote_sent", "won", "lost"];

const CRM_PAGE_LABELS = [
  "Sales CRM",
  "Leads door de pipeline tot gewonnen of verloren, met een omzet-forecast op basis van dealwaarde x win-kans.",
  "Openstaande pipeline",
  "Gewogen forecast (openstaand)",
  "Gewonnen (totaal)",
  "Forecast per maand (openstaand, gewogen)",
  "Onbekende sluitdatum",
  "Nieuwe lead",
  "Bedrijfsnaam",
  "Contactpersoon",
  "E-mail",
  "Telefoon",
  "Website",
  "Bron",
  "Bv. beurs, referral, koud",
  "Stadium",
  "Dealwaarde (€)",
  "Win-kans (%)",
  "Verwachte sluitdatum",
  "Notities",
  "Lead toevoegen",
  "Lead",
  "Contact gelegd",
  "Voorstel",
  "Offerte verstuurd",
  "Gewonnen",
  "Verloren",
  "Nog geen leads in dit stadium.",
  "Opslaan",
  "Lead verwijderen",
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
];

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export default async function CrmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const [{ data: leads }, lang] = await Promise.all([
    supabase
      .from("sales_leads")
      .select("*")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<SalesLead[]>(),
    getAppLang(),
  ]);

  const leadIds = (leads ?? []).map((l) => l.id);
  const { data: activities } = leadIds.length
    ? await supabase
        .from("sales_lead_activities")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
        .returns<SalesLeadActivity[]>()
    : { data: [] as SalesLeadActivity[] };

  const activitiesByLead = new Map<string, SalesLeadActivity[]>();
  for (const activity of activities ?? []) {
    const list = activitiesByLead.get(activity.lead_id) ?? [];
    list.push(activity);
    activitiesByLead.set(activity.lead_id, list);
  }

  const t = await createTranslator(lang, [
    ...CRM_PAGE_LABELS,
    ...(leads ?? []).map((l) => l.company_name),
  ]);

  const STAGE_LABELS: Record<SalesLeadStage, string> = {
    lead: t("Lead"),
    contacted: t("Contact gelegd"),
    proposal: t("Voorstel"),
    quote_sent: t("Offerte verstuurd"),
    won: t("Gewonnen"),
    lost: t("Verloren"),
  };

  const openLeads = (leads ?? []).filter((l) => l.stage !== "won" && l.stage !== "lost");
  const openPipelineTotal = openLeads.reduce((sum, l) => sum + l.estimated_value, 0);
  const weightedForecastTotal = openLeads.reduce(
    (sum, l) => sum + (l.estimated_value * l.probability_percentage) / 100,
    0
  );
  const wonTotal = (leads ?? [])
    .filter((l) => l.stage === "won")
    .reduce((sum, l) => sum + l.estimated_value, 0);

  const forecastByMonth = new Map<string, number>();
  for (const lead of openLeads) {
    const key = lead.expected_close_date ? monthKey(lead.expected_close_date) : "unknown";
    const weighted = (lead.estimated_value * lead.probability_percentage) / 100;
    forecastByMonth.set(key, (forecastByMonth.get(key) ?? 0) + weighted);
  }
  const sortedForecastMonths = Array.from(forecastByMonth.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const leadsByStage = new Map<SalesLeadStage, SalesLead[]>();
  for (const stage of STAGES) leadsByStage.set(stage, []);
  for (const lead of leads ?? []) {
    leadsByStage.get(lead.stage)?.push(lead);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          {t("Sales CRM")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Leads door de pipeline tot gewonnen of verloren, met een omzet-forecast op basis van dealwaarde x win-kans."
          )}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Openstaande pipeline")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{euro(openPipelineTotal)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Gewogen forecast (openstaand)")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{euro(weightedForecastTotal)}</CardContent>
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

        {sortedForecastMonths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Forecast per maand (openstaand, gewogen)")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {sortedForecastMonths.map(([key, value]) => (
                  <div key={key} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{key === "unknown" ? t("Onbekende sluitdatum") : key}</p>
                    <p className="text-muted-foreground">{euro(value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuwe lead")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLead} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-company">{t("Bedrijfsnaam")}</Label>
                  <Input id="new-company" name="company_name" required />
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
                  <Label htmlFor="new-website">{t("Website")}</Label>
                  <Input id="new-website" name="website" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-source">{t("Bron")}</Label>
                  <Input id="new-source" name="source" placeholder={t("Bv. beurs, referral, koud")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-stage">{t("Stadium")}</Label>
                  <select
                    id="new-stage"
                    name="stage"
                    defaultValue="lead"
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
                  <Label htmlFor="new-value">{t("Dealwaarde (€)")}</Label>
                  <Input id="new-value" name="estimated_value" type="number" step="0.01" min="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-close-date">{t("Verwachte sluitdatum")}</Label>
                  <Input id="new-close-date" name="expected_close_date" type="date" />
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
              <Button type="submit">{t("Lead toevoegen")}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {STAGES.map((stage) => {
            const stageLeads = leadsByStage.get(stage) ?? [];
            return (
              <Card key={stage}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {STAGE_LABELS[stage]}
                    <Badge variant="secondary">{stageLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("Nog geen leads in dit stadium.")}</p>
                  ) : (
                    stageLeads.map((lead) => (
                      <details key={lead.id} className="rounded-md border p-2.5">
                        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{t(lead.company_name)}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {euro(lead.estimated_value)} · {lead.probability_percentage}%
                          </span>
                        </summary>

                        <div className="mt-3 space-y-4 border-t pt-3">
                          <form action={updateLead.bind(null, lead.id)} className="space-y-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Bedrijfsnaam")}</Label>
                                <Input name="company_name" defaultValue={lead.company_name} className="h-8 text-xs" required />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Contactpersoon")}</Label>
                                <Input name="contact_name" defaultValue={lead.contact_name} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("E-mail")}</Label>
                                <Input name="contact_email" type="email" defaultValue={lead.contact_email} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Telefoon")}</Label>
                                <Input name="contact_phone" defaultValue={lead.contact_phone} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Website")}</Label>
                                <Input name="website" defaultValue={lead.website} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Bron")}</Label>
                                <Input name="source" defaultValue={lead.source} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Stadium")}</Label>
                                <select
                                  name="stage"
                                  defaultValue={lead.stage}
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
                                <Label className="text-xs">{t("Dealwaarde (€)")}</Label>
                                <Input
                                  name="estimated_value"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={lead.estimated_value}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Win-kans (%)")}</Label>
                                <Input
                                  name="probability_percentage"
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="100"
                                  defaultValue={lead.probability_percentage}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Verwachte sluitdatum")}</Label>
                                <Input
                                  name="expected_close_date"
                                  type="date"
                                  defaultValue={lead.expected_close_date ?? ""}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("Notities")}</Label>
                              <textarea
                                name="notes"
                                defaultValue={lead.notes}
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

                          <form action={deleteLead.bind(null, lead.id)}>
                            <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                              {t("Lead verwijderen")}
                            </Button>
                          </form>

                          {lead.stage === "won" &&
                            (lead.project_id ? (
                              <p className="text-xs">
                                <a
                                  href={`/projects/${lead.project_id}`}
                                  className="font-medium text-primary underline"
                                >
                                  {t("Gekoppeld project")} →
                                </a>
                              </p>
                            ) : (
                              <form
                                action={convertLeadToProject.bind(null, lead.id)}
                                className="space-y-2 rounded-md border p-2.5"
                              >
                                <p className="text-xs font-medium">{t("Omzetten naar project")}</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <Input
                                    name="name"
                                    placeholder={t("Projectnaam")}
                                    defaultValue={lead.company_name}
                                    className="h-8 text-xs"
                                    required
                                  />
                                  <Input
                                    name="client_name"
                                    placeholder={t("Klantnaam")}
                                    defaultValue={lead.company_name}
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
                            <form action={addLeadActivity.bind(null, lead.id)} className="flex items-end gap-1.5">
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
                            {(activitiesByLead.get(lead.id) ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">{t("Nog geen interacties gelogd.")}</p>
                            ) : (
                              <ul className="space-y-1">
                                {(activitiesByLead.get(lead.id) ?? []).map((activity) => (
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
                                    <form action={deleteLeadActivity.bind(null, activity.id)}>
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
