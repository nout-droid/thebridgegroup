import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { catalogCategoryLabel, type MaterialListItem } from "@/lib/types";
import { deleteMaterialListItem, pushMaterialListGroupToQuote, uploadMaterialList } from "./actions";
import { MatchPicker } from "./match-picker";

function lineTotal(item: MaterialListItem, multiplier: number) {
  if (item.unit_price == null) return null;
  return item.quantity * item.unit_price * multiplier;
}

export function MaterialList({
  projectId,
  items,
  rentalMultiplier,
}: {
  projectId: string;
  items: MaterialListItem[];
  rentalMultiplier: number;
}) {
  const groups = new Map<
    string,
    { category: string; supplierId: string; supplierName: string; total: number }
  >();

  for (const item of items) {
    const article = item.matched_article;
    if (!article || item.unit_price == null) continue;
    const key = `${article.category}::${article.supplier_id}`;
    const total = lineTotal(item, rentalMultiplier) ?? 0;
    const existing = groups.get(key);
    if (existing) {
      existing.total += total;
    } else {
      groups.set(key, {
        category: article.category,
        supplierId: article.supplier_id,
        supplierName: article.supplier?.name ?? "Onbekend",
        total,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Materiaallijst</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={uploadMaterialList.bind(null, projectId)} className="flex items-center gap-2">
          <Input type="file" name="file" accept=".csv,.xlsx" required className="max-w-xs" />
          <Button type="submit" size="sm">
            Uploaden
          </Button>
        </form>

        {!items.length ? (
          <p className="text-sm text-muted-foreground">
            Nog geen materiaallijst geüpload. Upload een CSV of Excel-export uit Vectorworks om
            automatisch een eerste prijsindicatie te krijgen.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Aantal</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Regeltotaal</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const total = lineTotal(item, rentalMultiplier);
                  const article = item.matched_article;
                  const label = article
                    ? `${article.supplier?.name ?? ""} — ${article.name} (€ ${article.day_price.toFixed(2)}/dag)`
                    : "Geen match";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs">{item.raw_description}</TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        <MatchPicker
                          projectId={projectId}
                          itemId={item.id}
                          currentLabel={label}
                          defaultQuery={item.raw_description}
                        />
                      </TableCell>
                      <TableCell>{total != null ? `€ ${total.toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <form action={deleteMaterialListItem.bind(null, projectId, item.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Verwijderen
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {groups.size > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Eerste prijsindicatie per categorie</p>
                {Array.from(groups.values()).map((group) => (
                  <div
                    key={`${group.category}::${group.supplierId}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {catalogCategoryLabel(group.category)} — {group.supplierName}:{" "}
                      <span className="font-medium">€ {group.total.toFixed(2)}</span>
                    </span>
                    <form
                      action={pushMaterialListGroupToQuote.bind(
                        null,
                        projectId,
                        group.category,
                        group.supplierId
                      )}
                    >
                      <Button type="submit" size="sm" variant="secondary">
                        Overnemen als offerte
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
