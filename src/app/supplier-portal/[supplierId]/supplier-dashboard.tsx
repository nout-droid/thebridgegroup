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
  projectName: string;
  documents: QuoteDocument[];
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
  quotes,
  isOwner = false,
}: {
  supplierId: string;
  supplierName: string;
  quotes: SupplierQuoteRow[];
  isOwner?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplierName} active="offertes" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <h1 className="text-2xl font-semibold">Jouw offertes</h1>

        {!quotes.length ? (
          <p className="text-sm text-muted-foreground">
            Er staan nog geen offerteverzoeken voor je klaar.
          </p>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <Card key={quote.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {quote.projectName} — {quote.categoryName}
                    </CardTitle>
                    <Badge variant="secondary">
                      {QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isOwner && (
                    <p className="text-sm text-muted-foreground">
                      Inkoopprijs (alleen voor jou zichtbaar):{" "}
                      <span className="font-semibold text-foreground">
                        &euro; {quote.costPrice.toFixed(2)}
                      </span>
                    </p>
                  )}

                  {quote.documents.length > 0 && (
                    <ul className="space-y-1">
                      {quote.documents.map((document) => (
                        <DocumentRow key={document.id} document={document} />
                      ))}
                    </ul>
                  )}

                  <form
                    action={uploadSupplierDocument.bind(null, supplierId, quote.id)}
                    className="flex items-center gap-2"
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
