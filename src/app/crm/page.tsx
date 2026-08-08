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
import type {
  SalesAcquisitionTarget,
  SalesLead,
  SalesLeadActivity,
  SalesLeadActivityType,
  SalesLeadStage,
} from "@/lib/types";
import {
  addLeadActivity,
  convertLeadToProject,
  createLead,
  deleteLead,
  deleteLeadActivity,
  updateAcquisitionTarget,
  updateLead,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { PersonalTouchButton, type PersonalTouchButtonLabels } from "./personal-touch-button";

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
  "Volgende follow-up",
  "Notities",
  "Zoek op bedrijf of contactpersoon",
  "Zoeken",
  "Laatste contact:",
  "Nog geen contact",
  "Vandaag",
  "Gisteren",
  "dagen geleden",
  "Follow-up verlopen",
  "Follow-up binnenkort",
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
  "Persoonlijk",
  "Verjaardag",
  "Gezin / kids",
  "Bv. 2 kinderen: Sophie (8), Max (5)",
  "Voorkeuren (eten/drinken)",
  "Bv. houdt van sushi en rode wijn, geen koffie",
  "Verjaardagen aankomend",
  "Niemand jarig in de komende 30 dagen.",
  "Koude acquisitie",
  "Acquisitie per maand",
  "Aantal acquisitie-activiteiten (bv. cold calls) per maand — zo zie je hoe actief de sales is.",
  "Maandtarget koude acquisitie",
  "Instellen",
  "van target",
  "Nog geen acquisitie-activiteiten gelogd.",
  "✨ Suggestie persoonlijk gebaar",
  "Bezig...",
  "Vul verjaardag, gezin of voorkeuren in voor een suggestie.",
];

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function formatLastContact(dateStr: string | undefined, t: (text: string) => string): string {
  if (!dateStr) return t("Nog geen contact");
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return t("Vandaag");
  if (days === 1) return t("Gisteren");
  return `${days} ${t("dagen geleden")}`;
}

function followUpUrgency(dateStr: string | null): "overdue" | "soon" | null {
  if (!dateStr) return null;
  const today = new Date(new Date().toDateString());
  const diffDays = Math.round((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return null;
}

// Dagen tot de volgende verjaardag, ongeacht geboortejaar — vergelijkt alleen maand+dag zodat
// een verjaardag die net is geweest niet als "morgen" verschijnt (springt dan naar volgend jaar).
function daysUntilNextBirthday(birthday: string): number {
  const today = new Date(new Date().toDateString());
  const [, month, day] = birthday.split("-").map(Number);
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatBirthday(birthday: string): string {
  const [, month, day] = birthday.split("-").map(Number);
  return new Date(2000, month - 1, day).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const [{ data: allLeads }, lang] = await Promise.all([
    supabase
      .from("sales_leads")
      .select("*")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<SalesLead[]>(),
    getAppLang(),
  ]);

  const leads = query
    ? (allLeads ?? []).filter(
        (l) =>
          l.company_name.toLowerCase().includes(query) ||
          l.contact_name.toLowerCase().includes(query) ||
          l.contact_email.toLowerCase().includes(query)
      )
    : allLeads;

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

  // Acquisitie-overzicht en verjaardagen kijken over ALLE leads van de eigenaar heen, niet
  // beperkt tot de (mogelijk gefilterde) zoekresultaten — dat zijn organisatiebrede cijfers.
  const allLeadIds = (allLeads ?? []).map((l) => l.id);
  const [{ data: allActivities }, { data: target }] = await Promise.all([
    allLeadIds.length
      ? supabase
          .from("sales_lead_activities")
          .select("*")
          .in("lead_id", allLeadIds)
          .order("created_at", { ascending: false })
          .returns<SalesLeadActivity[]>()
      : Promise.resolve({ data: [] as SalesLeadActivity[] }),
    supabase
      .from("sales_acquisition_targets")
      .select("*")
      .eq("user_id", ownerId)
      .maybeSingle<SalesAcquisitionTarget>(),
  ]);

  const t = await createTranslator(lang, [
    ...CRM_PAGE_LABELS,
    ...(leads ?? []).map((l) => l.company_name),
  ]);

  const personalTouchLabels: PersonalTouchButtonLabels = {
    trigger: t("✨ Suggestie persoonlijk gebaar"),
    loading: t("Bezig..."),
    unavailable: t("Vul verjaardag, gezin of voorkeuren in voor een suggestie."),
  };

  const ACTIVITY_TYPE_LABELS: Record<SalesLeadActivityType, string> = {
    call: t("Bellen"),
    cold_call: t("Koude acquisitie"),
    email: t("E-mail"),
    meeting: t("Afspraak"),
    note: t("Notitie"),
  };

  // Verjaardagen aankomend (komende 30 dagen), gesorteerd op dichtstbijzijnde datum.
  const upcomingBirthdays = (allLeads ?? [])
    .filter((l) => l.contact_birthday)
    .map((l) => ({ lead: l, daysUntil: daysUntilNextBirthday(l.contact_birthday!) }))
    .filter((item) => item.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Acquisitie per maand: laatste 6 maanden, geteld op activity_type — "koude acquisitie" is
  // de directe proxy voor cold calls, de rest telt mee als algemeen sales-activiteitenniveau.
  const acquisitionByMonth = new Map<string, { cold_call: number; other: number }>();
  const monthCursor = new Date();
  monthCursor.setDate(1);
  const monthList: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthList.push(key);
    acquisitionByMonth.set(key, { cold_call: 0, other: 0 });
  }
  for (const activity of allActivities ?? []) {
    const key = monthKey(activity.created_at);
    const bucket = acquisitionByMonth.get(key);
    if (!bucket) continue;
    if (activity.activity_type === "cold_call") bucket.cold_call += 1;
    else bucket.other += 1;
  }
  const currentMonthKeyStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const currentMonthColdCalls = acquisitionByMonth.get(currentMonthKeyStr)?.cold_call ?? 0;
  const acquisitionTarget = target?.target_per_month ?? 0;

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
  // Binnen elk stadium: urgentste follow-up eerst, geen follow-up-datum onderaan.
  for (const stage of STAGES) {
    leadsByStage.get(stage)?.sort((a, b) => {
      if (!a.next_follow_up_date && !b.next_follow_up_date) return 0;
      if (!a.next_follow_up_date) return 1;
      if (!b.next_follow_up_date) return -1;
      return a.next_follow_up_date.localeCompare(b.next_follow_up_date);
    });
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Verjaardagen aankomend")}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("Niemand jarig in de komende 30 dagen.")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {upcomingBirthdays.map(({ lead, daysUntil }) => (
                    <li key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-medium">{lead.contact_name || lead.company_name}</span>
                        <span className="text-muted-foreground"> — {t(lead.company_name)}</span>
                      </span>
                      <Badge variant={daysUntil <= 3 ? "destructive" : "secondary"}>
                        {formatBirthday(lead.contact_birthday!)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Acquisitie per maand")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Aantal acquisitie-activiteiten (bv. cold calls) per maand — zo zie je hoe actief de sales is.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {monthList.map((key) => {
                  const bucket = acquisitionByMonth.get(key)!;
                  const isCurrent = key === currentMonthKeyStr;
                  return (
                    <div
                      key={key}
                      className={`rounded-md border px-2.5 py-1.5 text-xs ${isCurrent ? "border-primary" : ""}`}
                    >
                      <p className="font-medium">{key}</p>
                      <p className="text-muted-foreground">
                        {bucket.cold_call} {t("Koude acquisitie").toLowerCase()}
                        {bucket.other > 0 ? ` · +${bucket.other}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
              {(allActivities ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">{t("Nog geen acquisitie-activiteiten gelogd.")}</p>
              )}
              <div className="flex items-center gap-2 border-t pt-3 text-sm">
                <span>
                  {currentMonthColdCalls}
                  {acquisitionTarget > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      / {acquisitionTarget} {t("van target")}
                    </span>
                  )}
                </span>
                {acquisitionTarget > 0 && (
                  <Badge variant={currentMonthColdCalls >= acquisitionTarget ? "secondary" : "outline"}>
                    {t("Koude acquisitie")}
                  </Badge>
                )}
              </div>
              <form action={updateAcquisitionTarget} className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="target_per_month" className="text-xs">
                    {t("Maandtarget koude acquisitie")}
                  </Label>
                  <Input
                    id="target_per_month"
                    name="target_per_month"
                    type="number"
                    min={0}
                    defaultValue={acquisitionTarget || ""}
                    className="h-8 w-28 text-xs"
                  />
                </div>
                <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                  {t("Instellen")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <form action="/crm" className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="crm-search">{t("Zoek op bedrijf of contactpersoon")}</Label>
            <Input id="crm-search" name="q" defaultValue={q ?? ""} className="max-w-sm" />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            {t("Zoeken")}
          </Button>
        </form>

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
                <div className="space-y-1.5">
                  <Label htmlFor="new-follow-up">{t("Volgende follow-up")}</Label>
                  <Input id="new-follow-up" name="next_follow_up_date" type="date" />
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
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{t("Persoonlijk")}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-birthday">{t("Verjaardag")}</Label>
                    <Input id="new-birthday" name="contact_birthday" type="date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-family">{t("Gezin / kids")}</Label>
                    <Input
                      id="new-family"
                      name="contact_family_notes"
                      placeholder={t("Bv. 2 kinderen: Sophie (8), Max (5)")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-preferences">{t("Voorkeuren (eten/drinken)")}</Label>
                    <Input
                      id="new-preferences"
                      name="contact_preferences"
                      placeholder={t("Bv. houdt van sushi en rode wijn, geen koffie")}
                    />
                  </div>
                </div>
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
                          <span className="min-w-0 truncate font-medium">{t(lead.company_name)}</span>
                          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                            {euro(lead.estimated_value)} · {lead.probability_percentage}%
                            {followUpUrgency(lead.next_follow_up_date) === "overdue" && (
                              <Badge variant="destructive" className="text-[10px]">
                                {t("Follow-up verlopen")}
                              </Badge>
                            )}
                            {followUpUrgency(lead.next_follow_up_date) === "soon" && (
                              <Badge variant="secondary" className="border border-amber-400 text-[10px] text-amber-700">
                                {t("Follow-up binnenkort")}
                              </Badge>
                            )}
                          </span>
                        </summary>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("Laatste contact:")} {formatLastContact(activitiesByLead.get(lead.id)?.[0]?.created_at, t)}
                        </p>

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
                              <div className="space-y-1">
                                <Label className="text-xs">{t("Volgende follow-up")}</Label>
                                <Input
                                  name="next_follow_up_date"
                                  type="date"
                                  defaultValue={lead.next_follow_up_date ?? ""}
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
                            <div className="space-y-2 rounded-md border p-2">
                              <p className="text-xs font-medium">{t("Persoonlijk")}</p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">{t("Verjaardag")}</Label>
                                  <Input
                                    name="contact_birthday"
                                    type="date"
                                    defaultValue={lead.contact_birthday ?? ""}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">{t("Gezin / kids")}</Label>
                                  <Input
                                    name="contact_family_notes"
                                    defaultValue={lead.contact_family_notes}
                                    placeholder={t("Bv. 2 kinderen: Sophie (8), Max (5)")}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">{t("Voorkeuren (eten/drinken)")}</Label>
                                  <Input
                                    name="contact_preferences"
                                    defaultValue={lead.contact_preferences}
                                    placeholder={t("Bv. houdt van sushi en rode wijn, geen koffie")}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <PersonalTouchButton leadId={lead.id} labels={personalTouchLabels} />
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
                                <option value="cold_call">{t("Koude acquisitie")}</option>
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
                                        {ACTIVITY_TYPE_LABELS[activity.activity_type]}
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
