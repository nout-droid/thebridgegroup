import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { checkCanViewBudget } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  computeClientPrice,
  type ActivityLogEntry,
  type Category,
  type ClientRequest,
  type IncidentReport,
  type Quote,
  type Stage,
  type Venue,
} from "@/lib/types";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activity-labels";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { computeRentalDays } from "@/lib/rental-days";
import { computeCo2Total } from "@/lib/co2";
import { generateClientUpdateDraft, setClientPassword, updateEventCode, updateProjectDetails } from "./actions";
import { createStage } from "./stages/actions";
import { acknowledgeActivity } from "./activity-actions";
import { updateClientRequestStatus } from "./client-requests-actions";
import { ShareLinkBox } from "./share-link-box";
import {
  SupplierDocumentReview,
  type SupplierDocumentReviewLabels,
} from "./supplier-document-review";
import {
  SupplierProjectDocumentReview,
  type SupplierProjectDocumentReviewLabels,
} from "./supplier-project-document-review";
import { ProjectSubNav } from "./project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import {
  SUPPLIER_DOCUMENT_REVIEW_LABELS,
  SUPPLIER_PROJECT_DOCUMENT_REVIEW_LABELS,
} from "./translation-labels";

// Het doorlopen van een leveranciers-offerte-PDF matcht elke regel tegen de catalogus
// (RPC-aanroepen) — bij een offerte met honderden regels kan dat de standaard 10-15s
// functie-timeout overschrijden, ook al lopen die aanroepen parallel.
export const maxDuration = 120;

const BUDGET_APPROVAL_LABELS: Record<string, string> = {
  pending: "Nog geen reactie",
  approved: "Goedgekeurd",
  changes_requested: "Aanpassing gevraagd",
  rejected: "Geweigerd",
};

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

const STATIC_LABELS = [
  "Productieboek",
  "Bundelt rider, hotel- en vluchtaanvraag, draaiboek, materieel, comms, stroom en catering in één PDF — voor de map on-site.",
  "Productieboek downloaden (PDF)",
  "AI-conceptmail voor klant",
  "Laat een conceptmail schrijven op basis van de recente activiteit op dit project — controleer en pas aan voor je 'm verstuurt.",
  "Genereer concept",
  "Gegenereerd op",
  "Recente activiteit",
  "Wijzigingen die een klant of leverancier zelf heeft doorgevoerd.",
  "Gezien",
  "Klantverzoeken",
  "Zelf ingediend door de klant in het portaal — dit valt",
  "niet",
  "in de begroting hierboven, behandel het los.",
  "Klantinvoer",
  "In behandeling nemen",
  "Afgehandeld",
  "Incidenten",
  "Meldingen van crew tijdens op-/afbouw of show.",
  "Foto bekijken",
  "Projectgegevens",
  "Projectnaam",
  "Klant",
  "Event datum",
  "Status",
  "Op-/afbouwperiode",
  "Bouw start",
  "Afbouw eind",
  "Showperiode",
  "Show start",
  "Show eind",
  "Type",
  "Dag",
  "Nacht",
  "Beide",
  "Locatie",
  "Geen locatie geselecteerd",
  "Locatiespecificaties",
  "Adres",
  "Capaciteit",
  "personen",
  "Stroomvoorziening",
  "Laad-in toegang",
  "Afmetingen",
  "Rigging",
  "Wifi",
  "Contact",
  "Notities",
  "Bewerken in locatiecatalogus →",
  "Totaal aantal huurdagen voor prijsberekening:",
  "Opslaan",
  "Klanttoegang",
  "De klant logt in op",
  "met dit Event ID en het wachtwoord dat jij instelt.",
  "Event ID",
  "Nieuw wachtwoord",
  "Wachtwoord instellen",
  "Nog geen wachtwoord ingesteld — de klant kan nog niet inloggen.",
  "Directe link (voor jezelf)",
  "Kopieer link",
  "Gekopieerd",
  "Totaalbudget (klant):",
  "Reactie klant op begroting",
  "Leveranciers-uploads ter controle",
  "Een leverancier heeft zelf een offerte-PDF geüpload. Loop 'm door voordat de cijfers in je begroting worden bijgewerkt.",
  "Onbekende leverancier",
  "Onbekende categorie",
  "Inchecken",
  "Live status via de badge-QR (crew) en gasten-badges — bijwerken door de pagina te verversen.",
  "Crew ingecheckt",
  "Gasten ingecheckt",
  "uitgecheckt",
  "CO2 — dit project",
  "Vluchten (crew)",
  "Transport (km-stelposten)",
  "Leveranciers (opgegeven)",
  "Bekijk alle projecten →",
  "Stages",
  "Nog geen stages. Voeg een stage toe als het event meerdere podia/locaties heeft die je apart wilt begroten.",
  "Nieuwe stage, bv. Hoofdpodium",
  "Stage toevoegen",
  ...Object.values(BUDGET_APPROVAL_LABELS),
  ...Object.values(CLIENT_REQUEST_CATEGORY_LABELS),
  ...Object.values(CLIENT_REQUEST_STATUS_LABELS),
  ...Object.values(ACTIVITY_CATEGORY_LABELS),
];

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days === 1 ? "" : "en"} geleden`;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const supabase = await createClient();

  interface PendingDocumentRow {
    id: string;
    original_filename: string;
    created_at: string;
    quote: {
      id: string;
      supplier: { name: string } | null;
      category: { name: string; project_id: string } | null;
    } | null;
  }

  interface PendingProjectDocumentRow {
    id: string;
    original_filename: string;
    created_at: string;
    supplier_id: string;
    supplier: { name: string } | null;
  }

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op 10+ losse round-trips naar Supabase.
  const [
    project,
    canViewBudget,
    { data: categories },
    { data: stages },
    { count: flightCount },
    { count: accreditedCrewCount },
    { count: checkedInCrewCount },
    { count: checkedOutCrewCount },
    { count: totalGuestCount },
    { count: checkedInGuestCount },
    { count: checkedOutGuestCount },
    { data: allPendingDocuments },
    { data: pendingProjectDocuments },
    { data: activity },
    { data: clientRequests },
    { data: incidentReports },
    { data: venues },
    headersList,
    lang,
  ] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    checkCanViewBudget(supabase, id),
    supabase
      .from("categories")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Category[]>(),
    supabase
      .from("stages")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<Stage[]>(),
    supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .eq("needs_flight", true),
    supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .eq("accredited", true),
    supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .eq("accredited", true)
      .not("checked_in_at", "is", null),
    supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .eq("accredited", true)
      .not("checked_out_at", "is", null),
    supabase.from("event_guests").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase
      .from("event_guests")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .not("checked_in_at", "is", null),
    supabase
      .from("event_guests")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .not("checked_out_at", "is", null),
    supabase
      .from("quote_documents")
      .select(
        "id, original_filename, created_at, quote:quotes(id, supplier:suppliers(name), category:categories(name, project_id))"
      )
      .eq("uploaded_by", "supplier")
      .is("confirmed_at", null)
      .not("quote_id", "is", null)
      .returns<PendingDocumentRow[]>(),
    supabase
      .from("quote_documents")
      .select("id, original_filename, created_at, supplier_id, supplier:suppliers(name)")
      .eq("uploaded_by", "supplier")
      .is("confirmed_at", null)
      .eq("project_id", id)
      .returns<PendingProjectDocumentRow[]>(),
    supabase
      .from("activity_log")
      .select("*")
      .eq("project_id", id)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .returns<ActivityLogEntry[]>(),
    supabase
      .from("client_requests")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<ClientRequest[]>(),
    supabase
      .from("incident_reports")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<IncidentReport[]>(),
    supabase.from("venues").select("*").order("name", { ascending: true }).returns<Venue[]>(),
    headers(),
    getAppLang(),
  ]);

  const selectedVenue = (venues ?? []).find((v) => v.id === project.venue_id) ?? null;

  const incidentReportsWithUrl = await Promise.all(
    (incidentReports ?? []).map(async (report) => ({
      ...report,
      photoUrl: report.photo_path ? await getSignedPortalUrl(report.photo_path) : null,
    }))
  );

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: quotes } = categoryIds.length
    ? await supabase
        .from("quotes")
        .select("*, supplier:suppliers(*), line_items:quote_line_items(*)")
        .in("category_id", categoryIds)
        .order("created_at", { ascending: true })
        .returns<Quote[]>()
    : { data: [] as Quote[] };

  const quotesByCategory = new Map<string, Quote[]>();
  for (const quote of quotes ?? []) {
    const list = quotesByCategory.get(quote.category_id) ?? [];
    list.push(quote);
    quotesByCategory.set(quote.category_id, list);
  }

  const totalBudget = (categories ?? []).reduce((sum, category) => {
    const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
    const cost = chosen?.cost_price ?? category.manual_cost;
    return cost !== null && cost !== undefined ? sum + computeClientPrice(category, cost) : sum;
  }, 0);

  const stageSubtotals = new Map<string, number>();
  for (const category of categories ?? []) {
    if (!category.stage_id) continue;
    const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
    const cost = chosen?.cost_price ?? category.manual_cost;
    const price = cost !== null && cost !== undefined ? computeClientPrice(category, cost) : 0;
    stageSubtotals.set(category.stage_id, (stageSubtotals.get(category.stage_id) ?? 0) + price);
  }

  const totalKm = (categories ?? []).reduce((sum, c) => sum + (c.estimated_km ?? 0), 0);
  const totalQuoteKg = (quotes ?? []).reduce((sum, q) => sum + (q.co2_kg ?? 0), 0);
  const projectCo2 = computeCo2Total(flightCount ?? 0, totalKm, totalQuoteKg);

  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const shareUrl = `${protocol}://${host}/share/${project.share_token}`;
  const portalUrl = `${protocol}://${host}/portal`;

  const pendingDocuments = (allPendingDocuments ?? []).filter(
    (d) => d.quote?.category?.project_id === id
  );
  const t = await createTranslator(lang, [
    ...STATIC_LABELS,
    ...(stages ?? []).map((s) => s.name),
    ...(activity ?? []).flatMap((entry) => [entry.actor_label, entry.description]),
    ...(clientRequests ?? []).flatMap((request) => [request.description, request.notes ?? ""]),
    ...incidentReportsWithUrl.flatMap((report) => [
      report.description,
      report.division,
      report.reported_by,
    ]),
    project.budget_approval_comment ?? "",
    project.status,
    ...SUPPLIER_DOCUMENT_REVIEW_LABELS,
    ...SUPPLIER_PROJECT_DOCUMENT_REVIEW_LABELS,
  ]);

  const supplierDocumentReviewLabels: SupplierDocumentReviewLabels = {
    busy: t("Bezig..."),
    review: t("Doorlopen"),
    ignore: t("Negeren"),
    noLinesFound: t("Geen regels herkend in dit PDF."),
    description: t("Omschrijving"),
    amount: t("Bedrag"),
    remove: t("Verwijderen"),
    confirm: t("Bevestigen"),
    lines: t("regels"),
    cancel: t("Annuleren"),
  };

  const supplierProjectDocumentReviewLabels: SupplierProjectDocumentReviewLabels = {
    busy: t("Bezig..."),
    review: t("Doorlopen"),
    ignore: t("Negeren"),
    noCategoriesWarning: t(
      "Deze leverancier is nog voor geen enkele categorie in dit project aangevraagd — er is niets om aan toe te wijzen."
    ),
    noLinesFound: t("Geen regels herkend in dit PDF."),
    description: t("Omschrijving"),
    amount: t("Bedrag"),
    category: t("Categorie"),
    notAssign: t("Niet toewijzen"),
    recognizedAs: t("Herkend als:"),
    remove: t("Verwijderen"),
    unassignedSuffix: t("regel(s) zonder categorie worden niet overgenomen."),
    confirm: t("Bevestigen"),
    lines: t("regels"),
    cancel: t("Annuleren"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="overview" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        {pageError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{pageError}</p>
        )}

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="font-medium">{t("Productieboek")}</p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Bundelt rider, hotel- en vluchtaanvraag, draaiboek, materieel, comms, stroom en catering in één PDF — voor de map on-site."
                )}
              </p>
            </div>
            <a
              href={`/projects/${project.id}/production-book`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t("Productieboek downloaden (PDF)")}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("AI-conceptmail voor klant")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Laat een conceptmail schrijven op basis van de recente activiteit op dit project — controleer en pas aan voor je 'm verstuurt."
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={generateClientUpdateDraft.bind(null, project.id)}>
              <Button type="submit" size="sm" variant="outline">
                {t("Genereer concept")}
              </Button>
            </form>
            {project.ai_client_update_draft && (
              <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                <p className="whitespace-pre-wrap text-sm">{project.ai_client_update_draft}</p>
                {project.ai_client_update_generated_at && (
                  <p className="text-xs text-muted-foreground">
                    {t("Gegenereerd op")}{" "}
                    {new Date(project.ai_client_update_generated_at).toLocaleString("nl-NL")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {activity && activity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Recente activiteit")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Wijzigingen die een klant of leverancier zelf heeft doorgevoerd.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {t(ACTIVITY_CATEGORY_LABELS[entry.category] ?? entry.category)}
                      </Badge>
                      <span className="font-medium">{t(entry.actor_label)}</span>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(entry.created_at)}
                      </span>
                    </div>
                    <p>{t(entry.description)}</p>
                  </div>
                  <form action={acknowledgeActivity.bind(null, project.id, entry.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {t("Gezien")}
                    </Button>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {clientRequests && clientRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Klantverzoeken")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Zelf ingediend door de klant in het portaal — dit valt")}{" "}
                <span className="font-medium text-foreground">{t("niet")}</span>{" "}
                {t("in de begroting hierboven, behandel het los.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {clientRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary text-primary">
                        {t("Klantinvoer")}
                      </Badge>
                      <Badge variant="secondary">
                        {t(CLIENT_REQUEST_CATEGORY_LABELS[request.category] ?? request.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t(CLIENT_REQUEST_STATUS_LABELS[request.status])}
                      </span>
                    </div>
                    <p>
                      {request.quantity}× {t(request.description)}
                      {request.requested_date && ` · ${request.requested_date}`}
                    </p>
                    {request.notes && (
                      <p className="text-xs text-muted-foreground">{t(request.notes)}</p>
                    )}
                  </div>
                  {request.status !== "done" && (
                    <form
                      action={updateClientRequestStatus.bind(
                        null,
                        project.id,
                        request.id,
                        request.status === "new" ? "acknowledged" : "done"
                      )}
                    >
                      <Button type="submit" size="sm" variant="ghost">
                        {request.status === "new" ? t("In behandeling nemen") : t("Afgehandeld")}
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {incidentReportsWithUrl.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Incidenten")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Meldingen van crew tijdens op-/afbouw of show.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {incidentReportsWithUrl.map((report) => (
                <div key={report.id} className="space-y-1 rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {report.division && <Badge variant="secondary">{t(report.division)}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(report.created_at)}
                    </span>
                    {report.reported_by && (
                      <span className="text-xs text-muted-foreground">— {t(report.reported_by)}</span>
                    )}
                  </div>
                  <p>{t(report.description)}</p>
                  {report.photoUrl && (
                    <a
                      href={report.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium underline underline-offset-2"
                    >
                      {t("Foto bekijken")}
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("Projectgegevens")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={updateProjectDetails.bind(null, project.id)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("Projectnaam")}</Label>
                <Input id="name" name="name" defaultValue={project.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_name">{t("Klant")}</Label>
                <Input id="client_name" name="client_name" defaultValue={project.client_name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event_date">{t("Event datum")}</Label>
                <Input
                  id="event_date"
                  name="event_date"
                  type="date"
                  defaultValue={project.event_date ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">{t("Status")}</Label>
                {lang === "en" ? (
                  // De status is vrije Nederlandse tekst zonder vast enum (zie schema.sql —
                  // geen check-constraint zoals bij category/quote status). In EN tonen we 'm
                  // daarom net als op /calendar en /projects vertaald via t(), maar read-only:
                  // anders zou opslaan de vertaalde EN-tekst terugschrijven als nieuwe (foutieve)
                  // Nederlandse status. Wijzigen kan gewoon in NL.
                  <>
                    <Input id="status" defaultValue={t(project.status)} readOnly className="bg-muted" />
                    <input type="hidden" name="status" value={project.status} />
                  </>
                ) : (
                  <Input id="status" name="status" defaultValue={project.status} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venue_id">{t("Locatie")}</Label>
                <select
                  id="venue_id"
                  name="venue_id"
                  defaultValue={project.venue_id ?? ""}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">{t("Geen locatie geselecteerd")}</option>
                  {(venues ?? []).map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 rounded-md border p-3 sm:col-span-4">
                <p className="text-sm font-medium">{t("Op-/afbouwperiode")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="build_start_date">{t("Bouw start")}</Label>
                    <Input
                      id="build_start_date"
                      name="build_start_date"
                      type="date"
                      defaultValue={project.build_start_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="strike_end_date">{t("Afbouw eind")}</Label>
                    <Input
                      id="strike_end_date"
                      name="strike_end_date"
                      type="date"
                      defaultValue={project.strike_end_date ?? ""}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3 sm:col-span-4">
                <p className="text-sm font-medium">{t("Showperiode")}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="show_start_date">{t("Show start")}</Label>
                    <Input
                      id="show_start_date"
                      name="show_start_date"
                      type="date"
                      defaultValue={project.show_start_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="show_end_date">{t("Show eind")}</Label>
                    <Input
                      id="show_end_date"
                      name="show_end_date"
                      type="date"
                      defaultValue={project.show_end_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="show_type">{t("Type")}</Label>
                    <select
                      id="show_type"
                      name="show_type"
                      defaultValue={project.show_type}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="dag">{t("Dag")}</option>
                      <option value="nacht">{t("Nacht")}</option>
                      <option value="beide">{t("Beide")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground sm:col-span-4">
                {t("Totaal aantal huurdagen voor prijsberekening:")}{" "}
                <span className="font-medium text-foreground">{computeRentalDays(project)}</span>
              </p>

              <Button type="submit" size="sm" className="sm:col-span-4 sm:w-fit">
                {t("Opslaan")}
              </Button>
            </form>

            <div className="space-y-3 border-t pt-4">
              <Label>{t("Klanttoegang")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("De klant logt in op")} <span className="font-mono">{portalUrl}</span>{" "}
                {t("met dit Event ID en het wachtwoord dat jij instelt.")}
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <form
                  action={updateEventCode.bind(null, project.id)}
                  className="flex items-end gap-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="event_code">{t("Event ID")}</Label>
                    <Input
                      id="event_code"
                      name="event_code"
                      defaultValue={project.event_code}
                      className="w-32 font-mono uppercase"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm">
                    {t("Opslaan")}
                  </Button>
                </form>

                <form
                  action={setClientPassword.bind(null, project.id)}
                  className="flex items-end gap-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="password">
                      {project.client_password_hash ? t("Nieuw wachtwoord") : t("Wachtwoord instellen")}
                    </Label>
                    <Input id="password" name="password" type="password" className="w-40" required />
                  </div>
                  <Button type="submit" size="sm">
                    {t("Opslaan")}
                  </Button>
                </form>
              </div>
              {!project.client_password_hash && (
                <p className="text-xs text-destructive">
                  {t("Nog geen wachtwoord ingesteld — de klant kan nog niet inloggen.")}
                </p>
              )}
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">{t("Directe link (voor jezelf)")}</summary>
                <div className="mt-2">
                  <ShareLinkBox url={shareUrl} copyLabel={t("Kopieer link")} copiedLabel={t("Gekopieerd")} />
                </div>
              </details>
            </div>

            {canViewBudget && (
              <p className="text-lg">
                {t("Totaalbudget (klant):")} <span className="font-semibold">&euro; {totalBudget.toFixed(2)}</span>
              </p>
            )}

            {project.budget_approval_status !== "pending" && (
              <div className="space-y-1 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Label>{t("Reactie klant op begroting")}</Label>
                  <Badge variant="secondary">
                    {t(BUDGET_APPROVAL_LABELS[project.budget_approval_status])}
                  </Badge>
                </div>
                {project.budget_approval_comment && (
                  <p className="text-sm text-muted-foreground">{t(project.budget_approval_comment)}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedVenue && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{t("Locatiespecificaties")}</CardTitle>
              <a href="/venues" className="text-sm text-muted-foreground hover:underline">
                {t("Bewerken in locatiecatalogus →")}
              </a>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {selectedVenue.name}
                {selectedVenue.address ? (
                  <span className="font-normal text-muted-foreground"> ({selectedVenue.address})</span>
                ) : null}
              </p>
              {selectedVenue.capacity && (
                <p>
                  <span className="text-muted-foreground">{t("Capaciteit")}: </span>
                  {selectedVenue.capacity} {t("personen")}
                </p>
              )}
              {selectedVenue.power_availability && (
                <p>
                  <span className="text-muted-foreground">{t("Stroomvoorziening")}: </span>
                  {selectedVenue.power_availability}
                </p>
              )}
              {selectedVenue.load_in_access && (
                <p>
                  <span className="text-muted-foreground">{t("Laad-in toegang")}: </span>
                  {selectedVenue.load_in_access}
                </p>
              )}
              {selectedVenue.dimensions && (
                <p>
                  <span className="text-muted-foreground">{t("Afmetingen")}: </span>
                  {selectedVenue.dimensions}
                </p>
              )}
              {selectedVenue.rigging_notes && (
                <p>
                  <span className="text-muted-foreground">{t("Rigging")}: </span>
                  {selectedVenue.rigging_notes}
                </p>
              )}
              {selectedVenue.wifi_notes && (
                <p>
                  <span className="text-muted-foreground">{t("Wifi")}: </span>
                  {selectedVenue.wifi_notes}
                </p>
              )}
              {(selectedVenue.contact_name || selectedVenue.contact_email || selectedVenue.contact_phone) && (
                <p>
                  <span className="text-muted-foreground">{t("Contact")}: </span>
                  {[selectedVenue.contact_name, selectedVenue.contact_email, selectedVenue.contact_phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {selectedVenue.notes && (
                <p>
                  <span className="text-muted-foreground">{t("Notities")}: </span>
                  {selectedVenue.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {(pendingDocuments.length > 0 || (pendingProjectDocuments?.length ?? 0) > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Leveranciers-uploads ter controle")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Een leverancier heeft zelf een offerte-PDF geüpload. Loop 'm door voordat de cijfers in je begroting worden bijgewerkt."
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(pendingProjectDocuments ?? []).map((doc) => (
                <SupplierProjectDocumentReview
                  key={doc.id}
                  projectId={project.id}
                  documentId={doc.id}
                  supplierId={doc.supplier_id}
                  label={`${doc.supplier?.name ?? t("Onbekende leverancier")} (${doc.original_filename})`}
                  labels={supplierProjectDocumentReviewLabels}
                />
              ))}
              {pendingDocuments.map((doc) => (
                <SupplierDocumentReview
                  key={doc.id}
                  projectId={project.id}
                  documentId={doc.id}
                  quoteId={doc.quote?.id ?? ""}
                  label={`${doc.quote?.supplier?.name ?? t("Onbekende leverancier")} — ${
                    doc.quote?.category?.name ?? t("Onbekende categorie")
                  } (${doc.original_filename})`}
                  labels={supplierDocumentReviewLabels}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {((accreditedCrewCount ?? 0) > 0 || (totalGuestCount ?? 0) > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Inchecken")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Live status via de badge-QR (crew) en gasten-badges — bijwerken door de pagina te verversen."
                )}
              </p>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("Crew ingecheckt")}</dt>
                  <dd className="text-xl font-semibold">
                    {checkedInCrewCount ?? 0}/{accreditedCrewCount ?? 0}
                  </dd>
                  <dd className="text-xs text-muted-foreground">
                    {checkedOutCrewCount ?? 0} {t("uitgecheckt")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Gasten ingecheckt")}</dt>
                  <dd className="text-xl font-semibold">
                    {checkedInGuestCount ?? 0}/{totalGuestCount ?? 0}
                  </dd>
                  <dd className="text-xs text-muted-foreground">
                    {checkedOutGuestCount ?? 0} {t("uitgecheckt")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("CO2 — dit project")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary">
              🌱 {Math.round(projectCo2.totalKg).toLocaleString("nl-NL")} kg
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("Vluchten (crew)")}</dt>
                <dd className="font-medium">
                  {Math.round(projectCo2.flightKg).toLocaleString("nl-NL")} kg
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Transport (km-stelposten)")}</dt>
                <dd className="font-medium">{Math.round(projectCo2.kmKg).toLocaleString("nl-NL")} kg</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Leveranciers (opgegeven)")}</dt>
                <dd className="font-medium">
                  {Math.round(projectCo2.quoteKg).toLocaleString("nl-NL")} kg
                </dd>
              </div>
            </dl>
            <Link href="/co2" className="mt-3 inline-block text-sm text-primary hover:underline">
              {t("Bekijk alle projecten →")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Stages")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!stages?.length ? (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Nog geen stages. Voeg een stage toe als het event meerdere podia/locaties heeft die je apart wilt begroten."
                )}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stages.map((stage) => (
                  <Link key={stage.id} href={`/projects/${project.id}/stages/${stage.id}`}>
                    <Card className="h-full transition-colors hover:border-foreground/30">
                      <CardContent className="pt-6">
                        <p className="font-medium">{t(stage.name)}</p>
                        {canViewBudget && (
                          <p className="text-sm text-muted-foreground">
                            &euro; {(stageSubtotals.get(stage.id) ?? 0).toFixed(2)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            <form action={createStage.bind(null, project.id)} className="flex items-end gap-2">
              <Input name="name" placeholder={t("Nieuwe stage, bv. Hoofdpodium")} required />
              <Button type="submit">{t("Stage toevoegen")}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
