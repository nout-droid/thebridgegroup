"use client";

import { Nav } from "../supplier-nav";
import { Footer } from "@/components/footer";
import { LanguageToggle } from "@/components/language-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS_LABELS, type QuoteLineItem, type QuoteStatus } from "@/lib/types";
import { useSupplierTranslator } from "../translator-context";

export interface BegrotingQuoteRow {
  id: string;
  categoryName: string;
  status: string;
  costPrice: number;
  lineItems: QuoteLineItem[];
}

export interface BegrotingProject {
  id: string;
  name: string;
}

function formatEuro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

export function SupplierBegrotingView({
  supplierId,
  supplierName,
  projects,
  selectedProjectId,
  quotes,
}: {
  supplierId: string;
  supplierName: string;
  projects: BegrotingProject[];
  selectedProjectId: string | null;
  quotes: BegrotingQuoteRow[];
}) {
  const { lang, setLang, t } = useSupplierTranslator();

  const projectTotal = quotes.reduce((sum, q) => sum + q.costPrice, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav supplierId={supplierId} supplierName={supplierName} active="begroting" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Begroting")}</h1>
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("Jouw eigen prijsopgave per categorie, inclusief regels waar bekend.")}
        </p>

        {!projects.length ? (
          <p className="text-sm text-muted-foreground">{t("Er staat nog geen offerteverzoek voor je klaar.")}</p>
        ) : (
          <>
            {projects.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/supplier-portal/${supplierId}/begroting?project=${project.id}`}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedProjectId === project.id
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {t(project.name)}
                  </Link>
                ))}
              </div>
            )}

            {!quotes.length ? (
              <p className="text-sm text-muted-foreground">{t("Voor dit project heb je nog geen offerte ingediend.")}</p>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const lineItemTotal = quote.lineItems.reduce(
                    (sum, item) => sum + item.quantity * item.unit_price,
                    0
                  );
                  return (
                    <Card key={quote.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">{t(quote.categoryName)}</CardTitle>
                        <Badge variant="secondary">
                          {t(QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status)}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {quote.lineItems.length > 0 && (
                          <ul className="space-y-1 text-sm">
                            {quote.lineItems.map((item) => (
                              <li key={item.id} className="flex items-center justify-between gap-2">
                                <span>{item.description}</span>
                                <span className="whitespace-nowrap text-muted-foreground">
                                  {item.quantity} &times; {formatEuro(item.unit_price)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
                          <span>{t("Totaal deze categorie")}</span>
                          <span>{formatEuro(quote.lineItems.length > 0 ? lineItemTotal : quote.costPrice)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3 text-sm font-semibold">
                  <span>{t("Totaal project")}</span>
                  <span>{formatEuro(projectTotal)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
