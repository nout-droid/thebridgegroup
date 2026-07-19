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
import { computeClientPrice, type ActivityLogEntry, type Category, type Quote, type Stage } from "@/lib/types";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activity-labels";
import { computeRentalDays } from "@/lib/rental-days";
import { setClientPassword, updateEventCode, updateProjectDetails } from "./actions";
import { createStage } from "./stages/actions";
import { acknowledgeActivity } from "./activity-actions";
import { ShareLinkBox } from "./share-link-box";
import { SupplierDocumentReview } from "./supplier-document-review";
import { ProjectSubNav } from "./project-sub-nav";

const BUDGET_APPROVAL_LABELS: Record<string, string> = {
  pending: "Nog geen reactie",
  approved: "Goedgekeurd",
  changes_requested: "Aanpassing gevraagd",
  rejected: "Geweigerd",
};

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

  const project = await getProjectOrNotFound(supabase, id);
  const canViewBudget = await checkCanViewBudget(supabase, id);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

  const { data: stages } = await supabase
    .from("stages")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Stage[]>();

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
    return chosen ? sum + computeClientPrice(category, chosen.cost_price) : sum;
  }, 0);

  const stageSubtotals = new Map<string, number>();
  for (const category of categories ?? []) {
    if (!category.stage_id) continue;
    const chosen = quotesByCategory.get(category.id)?.find((q) => q.status === "gekozen");
    const price = chosen ? computeClientPrice(category, chosen.cost_price) : 0;
    stageSubtotals.set(category.stage_id, (stageSubtotals.get(category.stage_id) ?? 0) + price);
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const shareUrl = `${protocol}://${host}/share/${project.share_token}`;
  const portalUrl = `${protocol}://${host}/portal`;

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

  const { data: allPendingDocuments } = await supabase
    .from("quote_documents")
    .select(
      "id, original_filename, created_at, quote:quotes(id, supplier:suppliers(name), category:categories(name, project_id))"
    )
    .eq("uploaded_by", "supplier")
    .is("confirmed_at", null)
    .returns<PendingDocumentRow[]>();

  const pendingDocuments = (allPendingDocuments ?? []).filter(
    (d) => d.quote?.category?.project_id === id
  );

  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("project_id", id)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .returns<ActivityLogEntry[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="overview" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        {pageError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{pageError}</p>
        )}

        {activity && activity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recente activiteit</CardTitle>
              <p className="text-sm text-muted-foreground">
                Wijzigingen die een klant of leverancier zelf heeft doorgevoerd.
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
                        {ACTIVITY_CATEGORY_LABELS[entry.category] ?? entry.category}
                      </Badge>
                      <span className="font-medium">{entry.actor_label}</span>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(entry.created_at)}
                      </span>
                    </div>
                    <p>{entry.description}</p>
                  </div>
                  <form action={acknowledgeActivity.bind(null, project.id, entry.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Gezien
                    </Button>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Projectgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={updateProjectDetails.bind(null, project.id)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Projectnaam</Label>
                <Input id="name" name="name" defaultValue={project.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_name">Klant</Label>
                <Input id="client_name" name="client_name" defaultValue={project.client_name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event_date">Event datum</Label>
                <Input
                  id="event_date"
                  name="event_date"
                  type="date"
                  defaultValue={project.event_date ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Input id="status" name="status" defaultValue={project.status} />
              </div>

              <div className="space-y-2 rounded-md border p-3 sm:col-span-4">
                <p className="text-sm font-medium">Op-/afbouwperiode</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="build_start_date">Bouw start</Label>
                    <Input
                      id="build_start_date"
                      name="build_start_date"
                      type="date"
                      defaultValue={project.build_start_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="strike_end_date">Afbouw eind</Label>
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
                <p className="text-sm font-medium">Showperiode</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="show_start_date">Show start</Label>
                    <Input
                      id="show_start_date"
                      name="show_start_date"
                      type="date"
                      defaultValue={project.show_start_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="show_end_date">Show eind</Label>
                    <Input
                      id="show_end_date"
                      name="show_end_date"
                      type="date"
                      defaultValue={project.show_end_date ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="show_type">Type</Label>
                    <select
                      id="show_type"
                      name="show_type"
                      defaultValue={project.show_type}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="dag">Dag</option>
                      <option value="nacht">Nacht</option>
                      <option value="beide">Beide</option>
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground sm:col-span-4">
                Totaal aantal huurdagen voor prijsberekening:{" "}
                <span className="font-medium text-foreground">{computeRentalDays(project)}</span>
              </p>

              <Button type="submit" size="sm" className="sm:col-span-4 sm:w-fit">
                Opslaan
              </Button>
            </form>

            <div className="space-y-3 border-t pt-4">
              <Label>Klanttoegang</Label>
              <p className="text-sm text-muted-foreground">
                De klant logt in op <span className="font-mono">{portalUrl}</span> met dit Event
                ID en het wachtwoord dat jij instelt.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <form
                  action={updateEventCode.bind(null, project.id)}
                  className="flex items-end gap-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="event_code">Event ID</Label>
                    <Input
                      id="event_code"
                      name="event_code"
                      defaultValue={project.event_code}
                      className="w-32 font-mono uppercase"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm">
                    Opslaan
                  </Button>
                </form>

                <form
                  action={setClientPassword.bind(null, project.id)}
                  className="flex items-end gap-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="password">
                      {project.client_password_hash ? "Nieuw wachtwoord" : "Wachtwoord instellen"}
                    </Label>
                    <Input id="password" name="password" type="password" className="w-40" required />
                  </div>
                  <Button type="submit" size="sm">
                    Opslaan
                  </Button>
                </form>
              </div>
              {!project.client_password_hash && (
                <p className="text-xs text-destructive">
                  Nog geen wachtwoord ingesteld — de klant kan nog niet inloggen.
                </p>
              )}
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">Directe link (voor jezelf)</summary>
                <div className="mt-2">
                  <ShareLinkBox url={shareUrl} />
                </div>
              </details>
            </div>

            {canViewBudget && (
              <p className="text-lg">
                Totaalbudget (klant): <span className="font-semibold">&euro; {totalBudget.toFixed(2)}</span>
              </p>
            )}

            {project.budget_approval_status !== "pending" && (
              <div className="space-y-1 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Label>Reactie klant op begroting</Label>
                  <Badge variant="secondary">
                    {BUDGET_APPROVAL_LABELS[project.budget_approval_status]}
                  </Badge>
                </div>
                {project.budget_approval_comment && (
                  <p className="text-sm text-muted-foreground">{project.budget_approval_comment}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {pendingDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leveranciers-uploads ter controle</CardTitle>
              <p className="text-sm text-muted-foreground">
                Een leverancier heeft zelf een offerte-PDF geüpload. Loop &apos;m door voordat de
                cijfers in je begroting worden bijgewerkt.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDocuments.map((doc) => (
                <SupplierDocumentReview
                  key={doc.id}
                  projectId={project.id}
                  documentId={doc.id}
                  quoteId={doc.quote?.id ?? ""}
                  label={`${doc.quote?.supplier?.name ?? "Onbekende leverancier"} — ${
                    doc.quote?.category?.name ?? "Onbekende categorie"
                  } (${doc.original_filename})`}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!stages?.length ? (
              <p className="text-sm text-muted-foreground">
                Nog geen stages. Voeg een stage toe als het event meerdere podia/locaties heeft
                die je apart wilt begroten.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stages.map((stage) => (
                  <Link key={stage.id} href={`/projects/${project.id}/stages/${stage.id}`}>
                    <Card className="h-full transition-colors hover:border-foreground/30">
                      <CardContent className="pt-6">
                        <p className="font-medium">{stage.name}</p>
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
              <Input name="name" placeholder="Nieuwe stage, bv. Hoofdpodium" required />
              <Button type="submit">Stage toevoegen</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
