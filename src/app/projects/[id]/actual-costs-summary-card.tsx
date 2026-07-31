import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { addActualCost, deleteActualCost } from "./actual-costs-actions";
import type { ActualCostRow } from "./category-card";
import type { Translator } from "@/lib/server/translate";

export const ACTUAL_COSTS_SUMMARY_LABELS = [
  "Begroot vs. werkelijk",
  "Vergelijking tussen de begrote inkoopkosten en wat leveranciers voor dit hele project daadwerkelijk hebben gefactureerd.",
  "Totaal begroot",
  "Totaal werkelijk",
  "Totaal verschil",
  "binnen budget",
  "boven budget",
  "Algemene/overheadkosten (geen categorie)",
  "Kosten die niet aan een specifieke categorie gekoppeld zijn.",
  "Nog geen algemene kosten geregistreerd.",
  "Omschrijving",
  "Bedrag (€)",
  "Factuurnr.",
  "Factuurdatum",
  "Bekijken",
  "Verwijderen",
  "Factuurnummer (optioneel)",
  "Factuurdatum (optioneel)",
  "Bestand (optioneel)",
  "Kosten toevoegen",
];

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

export function ActualCostsSummaryCard({
  projectId,
  totalBudgeted,
  totalActual,
  unlinkedActualCosts,
  t,
}: {
  projectId: string;
  totalBudgeted: number;
  totalActual: number;
  unlinkedActualCosts: ActualCostRow[];
  t: Translator;
}) {
  const variance = totalActual - totalBudgeted;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Begroot vs. werkelijk")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            "Vergelijking tussen de begrote inkoopkosten en wat leveranciers voor dit hele project daadwerkelijk hebben gefactureerd."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("Totaal begroot")}</p>
            <p className="text-xl font-semibold">{euro(totalBudgeted)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Totaal werkelijk")}</p>
            <p className="text-xl font-semibold">{euro(totalActual)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Totaal verschil")}</p>
            <p
              className={cn(
                "text-xl font-semibold",
                variance > 0 ? "text-destructive" : "text-green-600"
              )}
            >
              {variance > 0 ? "+" : ""}
              {euro(variance)}{" "}
              <span className="text-sm font-normal">
                ({variance > 0 ? t("boven budget") : t("binnen budget")})
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div>
            <h4 className="text-sm font-semibold">
              {t("Algemene/overheadkosten (geen categorie)")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("Kosten die niet aan een specifieke categorie gekoppeld zijn.")}
            </p>
          </div>

          {unlinkedActualCosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Nog geen algemene kosten geregistreerd.")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Omschrijving")}</TableHead>
                  <TableHead>{t("Bedrag (€)")}</TableHead>
                  <TableHead>{t("Factuurnr.")}</TableHead>
                  <TableHead>{t("Factuurdatum")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlinkedActualCosts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.description}</TableCell>
                    <TableCell>{euro(row.amount)}</TableCell>
                    <TableCell>{row.invoice_number || "—"}</TableCell>
                    <TableCell>{row.invoice_date || "—"}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t("Bekijken")}
                        </a>
                      )}
                      <form action={deleteActualCost.bind(null, projectId, row.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <form
            action={addActualCost.bind(null, projectId)}
            className="grid grid-cols-2 gap-3 sm:grid-cols-5"
          >
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="ac-general-description">{t("Omschrijving")}</Label>
              <Input id="ac-general-description" name="description" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-general-amount">{t("Bedrag (€)")}</Label>
              <Input id="ac-general-amount" name="amount" type="number" step="0.01" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-general-invoice-number">{t("Factuurnummer (optioneel)")}</Label>
              <Input id="ac-general-invoice-number" name="invoice_number" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-general-invoice-date">{t("Factuurdatum (optioneel)")}</Label>
              <Input id="ac-general-invoice-date" name="invoice_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-general-file">{t("Bestand (optioneel)")}</Label>
              <Input id="ac-general-file" name="file" type="file" />
            </div>
            <Button type="submit" size="sm" className="col-span-2 sm:col-span-5 sm:w-fit">
              {t("Kosten toevoegen")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
