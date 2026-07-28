import { Fragment } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
  computeClientPrice,
  type Category,
  type Quote,
  type Supplier,
} from "@/lib/types";
import {
  chooseQuote,
  createQuote,
  deleteCategory,
  deleteQuote,
  updateCategory,
} from "./actions";
import { QuoteLineItems, QUOTE_LINE_ITEMS_LABELS } from "./quote-line-items";
import type { Translator } from "@/lib/server/translate";
import type { SupplierConflict } from "@/lib/server/supplier-conflicts";

function formatConflictDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export const CATEGORY_CARD_LABELS = [
  "Categorie verwijderen",
  "Naam",
  "Status",
  "Marge type",
  "Percentage",
  "Vast bedrag",
  "Marge waarde",
  "Stelpost (indien geen offerte)",
  "Handmatige inschatting",
  "Geschat aantal km (optioneel)",
  "Voor CO2-indicatie",
  "Opslaan",
  "Een stelpost telt mee in de begroting zolang er geen gekozen offerte is — zodra je een offerte kiest, wint die.",
  "Nog geen offertes toegevoegd.",
  "Leverancier",
  "Inkoopprijs",
  "Kiezen",
  "Verwijderen",
  "Kies leverancier",
  "Inkoopprijs (optioneel)",
  "Nog onbekend? Laat leeg",
  "CO2 (kg, optioneel)",
  "Bv. transport",
  "Offerte toevoegen",
  "Klantprijs:",
  "inkoop",
  "+ marge",
  "· stelpost",
  ...Object.values(CATEGORY_STATUS_LABELS),
  ...Object.values(QUOTE_STATUS_LABELS),
  ...QUOTE_LINE_ITEMS_LABELS,
  "is ook bevestigd op",
  "— controleer op een planningsconflict.",
];

export function CategoryCard({
  projectId,
  category,
  quotes,
  suppliers,
  conflictsBySupplier,
  t,
}: {
  projectId: string;
  category: Category;
  quotes: Quote[];
  suppliers: Supplier[];
  conflictsBySupplier?: Map<string, SupplierConflict[]>;
  t: Translator;
}) {
  const chosenQuote = quotes.find((q) => q.status === "gekozen");
  const effectiveCost = chosenQuote?.cost_price ?? category.manual_cost ?? null;
  const clientPrice = effectiveCost !== null ? computeClientPrice(category, effectiveCost) : null;
  const conflicts = chosenQuote ? conflictsBySupplier?.get(chosenQuote.supplier_id) : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t(category.name)}</CardTitle>
        <form action={deleteCategory.bind(null, projectId, category.id)}>
          <Button type="submit" variant="ghost" size="sm">
            {t("Categorie verwijderen")}
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          action={updateCategory.bind(null, projectId, category.id)}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor={`name-${category.id}`}>{t("Naam")}</Label>
            <Input id={`name-${category.id}`} name="name" defaultValue={category.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`status-${category.id}`}>{t("Status")}</Label>
            <Select
              name="status"
              defaultValue={category.status}
              items={Object.entries(CATEGORY_STATUS_LABELS).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            >
              <SelectTrigger id={`status-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {t(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`margin_type-${category.id}`}>{t("Marge type")}</Label>
            <Select
              name="margin_type"
              defaultValue={category.margin_type}
              items={[
                { value: "percentage", label: t("Percentage") },
                { value: "fixed", label: t("Vast bedrag") },
              ]}
            >
              <SelectTrigger id={`margin_type-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t("Percentage")}</SelectItem>
                <SelectItem value="fixed">{t("Vast bedrag")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`margin_value-${category.id}`}>{t("Marge waarde")}</Label>
            <Input
              id={`margin_value-${category.id}`}
              name="margin_value"
              type="number"
              step="0.01"
              defaultValue={category.margin_value}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`manual_cost-${category.id}`}>{t("Stelpost (indien geen offerte)")}</Label>
            <Input
              id={`manual_cost-${category.id}`}
              name="manual_cost"
              type="number"
              step="0.01"
              placeholder={t("Handmatige inschatting")}
              defaultValue={category.manual_cost ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`estimated_km-${category.id}`}>{t("Geschat aantal km (optioneel)")}</Label>
            <Input
              id={`estimated_km-${category.id}`}
              name="estimated_km"
              type="number"
              step="1"
              placeholder={t("Voor CO2-indicatie")}
              defaultValue={category.estimated_km ?? ""}
            />
          </div>
          <Button type="submit" size="sm" className="col-span-2 sm:col-span-4 sm:w-fit">
            {t("Opslaan")}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          {t(
            "Een stelpost telt mee in de begroting zolang er geen gekozen offerte is — zodra je een offerte kiest, wint die."
          )}
        </p>

        {conflicts && conflicts.length > 0 && (
          <div className="space-y-1 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-2.5 text-xs text-yellow-800">
            {conflicts.map((conflict) => (
              <p key={conflict.projectId}>
                ⚠️ {chosenQuote?.supplier?.name} {t("is ook bevestigd op")}{" "}
                <Link
                  href={`/projects/${conflict.projectId}`}
                  className="font-medium underline underline-offset-2"
                >
                  {conflict.projectName}
                </Link>{" "}
                ({formatConflictDate(conflict.start)}–{formatConflictDate(conflict.end)}){" "}
                {t("— controleer op een planningsconflict.")}
              </p>
            ))}
          </div>
        )}

        {!quotes.length ? (
          <p className="text-sm text-muted-foreground">{t("Nog geen offertes toegevoegd.")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Leverancier")}</TableHead>
                <TableHead>{t("Inkoopprijs")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <Fragment key={quote.id}>
                  <TableRow>
                    <TableCell className="font-medium">{quote.supplier?.name}</TableCell>
                    <TableCell>&euro;&nbsp;{quote.cost_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={quote.status === "gekozen" ? "default" : "secondary"}>
                        {t(QUOTE_STATUS_LABELS[quote.status])}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {quote.status !== "gekozen" && (
                        <form action={chooseQuote.bind(null, projectId, quote.id)}>
                          <Button type="submit" size="sm" variant="secondary">
                            {t("Kiezen")}
                          </Button>
                        </form>
                      )}
                      <form action={deleteQuote.bind(null, projectId, quote.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted/30 p-0">
                      <QuoteLineItems
                        projectId={projectId}
                        quoteId={quote.id}
                        lineItems={quote.line_items ?? []}
                        t={t}
                      />
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}

        <form
          action={createQuote.bind(null, projectId, category.id)}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`supplier-${category.id}`}>{t("Leverancier")}</Label>
            <Select name="supplier_id">
              <SelectTrigger id={`supplier-${category.id}`}>
                <SelectValue placeholder={t("Kies leverancier")} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`cost_price-${category.id}`}>{t("Inkoopprijs (optioneel)")}</Label>
            <Input
              id={`cost_price-${category.id}`}
              name="cost_price"
              type="number"
              step="0.01"
              placeholder={t("Nog onbekend? Laat leeg")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`quote_status-${category.id}`}>{t("Status")}</Label>
            <Select
              name="status"
              defaultValue="aangevraagd"
              items={Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            >
              <SelectTrigger id={`quote_status-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {t(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`co2-${category.id}`}>{t("CO2 (kg, optioneel)")}</Label>
            <Input
              id={`co2-${category.id}`}
              name="co2_kg"
              type="number"
              step="0.1"
              placeholder={t("Bv. transport")}
            />
          </div>
          <Button type="submit" size="sm" className="self-end">
            {t("Offerte toevoegen")}
          </Button>
        </form>

        {clientPrice !== null && (
          <p className="text-sm">
            {t("Klantprijs:")} <span className="font-semibold">&euro; {clientPrice.toFixed(2)}</span>{" "}
            <span className="text-muted-foreground">
              ({t("inkoop")} &euro; {effectiveCost!.toFixed(2)} {t("+ marge")} &euro;{" "}
              {(clientPrice - effectiveCost!).toFixed(2)}
              {!chosenQuote && ` ${t("· stelpost")}`})
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
