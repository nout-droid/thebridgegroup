"use client";

import { Nav } from "./supplier-nav";
import { Footer } from "@/components/footer";
import { LanguageToggle } from "@/components/language-toggle";
import { useTranslator } from "@/hooks/use-translator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QUOTE_STATUS_LABELS, type QuoteDocument, type QuoteStatus } from "@/lib/types";
import { uploadSupplierDocument } from "./actions";

type DocumentWithUrl = QuoteDocument & { signedUrl: string | null };

export interface SupplierQuoteRow {
  id: string;
  costPrice: number;
  status: string;
  categoryName: string;
  documents: DocumentWithUrl[];
}

export interface SupplierProjectGroup {
  projectId: string;
  projectName: string;
  quotes: SupplierQuoteRow[];
  pendingDocuments: DocumentWithUrl[];
}

const STATIC_LABELS = [
  "Jouw offertes",
  "Er staan nog geen offerteverzoeken voor je klaar.",
  "Upload één offerte-PDF voor alle categorieën hieronder tegelijk — we splitsen de kosten er zelf uit. Alle technische info en tekeningen vind je onder Event rider.",
  "Al verwerkte offerte-documenten",
  "Geüpload, wacht op verwerking door The Bridge",
  "Offerte-PDF uploaden",
  "Bekijken",
  "(door The Bridge)",
  "bevestigd",
  "ter controle",
  ...Object.values(QUOTE_STATUS_LABELS),
];

function DocumentRow({ document, t }: { document: DocumentWithUrl; t: (text: string) => string }) {
  return (
    <li className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {new Date(document.created_at).toLocaleString("nl-NL")} — {document.original_filename}
        {document.uploaded_by === "owner" && ` ${t("(door The Bridge)")}`}
        {document.confirmed_at ? ` — ${t("bevestigd")}` : ` — ${t("ter controle")}`}
      </span>
      {document.signedUrl && (
        <a href={document.signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {t("Bekijken")}
        </a>
      )}
    </li>
  );
}

export function SupplierDashboard({
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
  const dynamicTexts = projects.map((p) => p.projectName);
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplierName} active="offertes" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
            {t("Jouw offertes")}
          </h1>
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>

        {!projects.length ? (
          <p className="text-sm text-muted-foreground">
            {t("Er staan nog geen offerteverzoeken voor je klaar.")}
          </p>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.projectId}>
                <CardHeader>
                  <CardTitle className="text-base">{t(project.projectName)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Upload één offerte-PDF voor alle categorieën hieronder tegelijk — we splitsen de kosten er zelf uit. Alle technische info en tekeningen vind je onder Event rider."
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1.5">
                    {project.quotes.map((quote) => (
                      <li key={quote.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>{t(quote.categoryName)}</span>
                        <span className="flex items-center gap-2">
                          {isOwner && (
                            <span className="text-muted-foreground">
                              &euro; {quote.costPrice.toFixed(2)}
                            </span>
                          )}
                          <Badge variant="secondary">
                            {t(QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status)}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {project.quotes.some((q) => q.documents.length > 0) && (
                    <div className="space-y-1 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("Al verwerkte offerte-documenten")}
                      </p>
                      <ul className="space-y-1">
                        {project.quotes.flatMap((q) => q.documents).map((document) => (
                          <DocumentRow key={document.id} document={document} t={t} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {project.pendingDocuments.length > 0 && (
                    <div className="space-y-1 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("Geüpload, wacht op verwerking door The Bridge")}
                      </p>
                      <ul className="space-y-1">
                        {project.pendingDocuments.map((document) => (
                          <DocumentRow key={document.id} document={document} t={t} />
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
                      {t("Offerte-PDF uploaden")}
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
