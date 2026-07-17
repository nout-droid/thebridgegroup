import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { computeClientPrice, type Category, type Quote, type Stage } from "@/lib/types";
import { setClientPassword, updateEventCode, updateProjectDetails } from "./actions";
import { createStage } from "./stages/actions";
import { ShareLinkBox } from "./share-link-box";
import { SupplierDocumentReview } from "./supplier-document-review";
import { ProjectSubNav } from "./project-sub-nav";

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

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="overview" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        {pageError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{pageError}</p>
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
              <div className="space-y-1.5">
                <Label htmlFor="rental_days">Aantal huurdagen</Label>
                <Input
                  id="rental_days"
                  name="rental_days"
                  type="number"
                  min={1}
                  defaultValue={project.rental_days}
                />
              </div>
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

            <p className="text-lg">
              Totaalbudget (klant): <span className="font-semibold">&euro; {totalBudget.toFixed(2)}</span>
            </p>
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
                        <p className="text-sm text-muted-foreground">
                          &euro; {(stageSubtotals.get(stage.id) ?? 0).toFixed(2)}
                        </p>
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
    </div>
  );
}
