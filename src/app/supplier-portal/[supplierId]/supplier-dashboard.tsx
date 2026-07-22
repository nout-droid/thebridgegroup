import { Nav } from "./supplier-nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QUOTE_STATUS_LABELS, type QuoteDocument, type QuoteStatus } from "@/lib/types";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { uploadSupplierDocument } from "./actions";

export interface SupplierQuoteRow {
  id: string;
  costPrice: number;
  status: string;
  categoryName: string;
  documents: QuoteDocument[];
}

export interface SupplierProjectGroup {
  projectId: string;
  projectName: string;
  quotes: SupplierQuoteRow[];
  pendingDocuments: QuoteDocument[];
}

async function DocumentRow({ document }: { document: QuoteDocument }) {
  const url = await getSignedPortalUrl(document.storage_path);
  return (
    <li className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {new Date(document.created_at).toLocaleString("nl-NL")} — {document.original_filename}
        {document.uploaded_by === "owner" && " (door The Bridge)"}
        {document.confirmed_at ? " — bevestigd" : " — ter controle"}
      </span>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Bekijken
        </a>
      )}
    </li>
  );
}

export async function SupplierDashboard({
  supplierId,
  supplierName,
  projects,
  isOwner = false,
}: {
  supplierId: string;
  supplierName: string;
  projects: SupplierProjectGroup[];
  isOwner?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplierName} active="offertes" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <h1 className="text-2xl font-semibold">Jouw offertes</h1>

        {!projects.length ? (
          <p className="text-sm text-muted-foreground">
            Er staan nog geen offerteverzoeken voor je klaar.
          </p>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.projectId}>
                <CardHeader>
                  <CardTitle className="text-base">{project.projectName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload één offerte-PDF voor alle categorieën hieronder tegelijk — we splitsen
                    de kosten er zelf uit. Alle technische info en tekeningen vind je onder Event rider.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1.5">
                    {project.quotes.map((quote) => (
                      <li key={quote.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>{quote.categoryName}</span>
                        <span className="flex items-center gap-2">
                          {isOwner && (
                            <span className="text-muted-foreground">
                              &euro; {quote.costPrice.toFixed(2)}
                            </span>
                          )}
                          <Badge variant="secondary">
                            {QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {project.quotes.some((q) => q.documents.length > 0) && (
                    <div className="space-y-1 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Al verwerkte offerte-documenten
                      </p>
                      <ul className="space-y-1">
                        {project.quotes.flatMap((q) => q.documents).map((document) => (
                          <DocumentRow key={document.id} document={document} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {project.pendingDocuments.length > 0 && (
                    <div className="space-y-1 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Geüpload, wacht op verwerking door The Bridge
                      </p>
                      <ul className="space-y-1">
                        {project.pendingDocuments.map((document) => (
                          <DocumentRow key={document.id} document={document} />
                        ))}
                      </ul>
                    </div>
                  )}

                  <form
                    action={uploadSupplierDocument.bind(null, supplierId, project.projectId)}
                    className="flex items-center gap-2 border-t pt-3"
                  >
                    <Input type="file" name="file" accept=".pdf" required className="max-w-xs" />
                    <Button type="submit" size="sm">
                      Offerte-PDF uploaden
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
