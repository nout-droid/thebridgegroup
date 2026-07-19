import { Fragment } from "react";
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
import { QuoteLineItems } from "./quote-line-items";

export function CategoryCard({
  projectId,
  category,
  quotes,
  suppliers,
}: {
  projectId: string;
  category: Category;
  quotes: Quote[];
  suppliers: Supplier[];
}) {
  const chosenQuote = quotes.find((q) => q.status === "gekozen");
  const clientPrice = chosenQuote ? computeClientPrice(category, chosenQuote.cost_price) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{category.name}</CardTitle>
        <form action={deleteCategory.bind(null, projectId, category.id)}>
          <Button type="submit" variant="ghost" size="sm">
            Categorie verwijderen
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          action={updateCategory.bind(null, projectId, category.id)}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor={`name-${category.id}`}>Naam</Label>
            <Input id={`name-${category.id}`} name="name" defaultValue={category.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`status-${category.id}`}>Status</Label>
            <Select name="status" defaultValue={category.status}>
              <SelectTrigger id={`status-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`margin_type-${category.id}`}>Marge type</Label>
            <Select name="margin_type" defaultValue={category.margin_type}>
              <SelectTrigger id={`margin_type-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Vast bedrag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`margin_value-${category.id}`}>Marge waarde</Label>
            <Input
              id={`margin_value-${category.id}`}
              name="margin_value"
              type="number"
              step="0.01"
              defaultValue={category.margin_value}
            />
          </div>
          <Button type="submit" size="sm" className="col-span-2 sm:col-span-4 sm:w-fit">
            Opslaan
          </Button>
        </form>

        {!quotes.length ? (
          <p className="text-sm text-muted-foreground">Nog geen offertes toegevoegd.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverancier</TableHead>
                <TableHead>Inkoopprijs</TableHead>
                <TableHead>Status</TableHead>
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
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {quote.status !== "gekozen" && (
                        <form action={chooseQuote.bind(null, projectId, quote.id)}>
                          <Button type="submit" size="sm" variant="secondary">
                            Kiezen
                          </Button>
                        </form>
                      )}
                      <form action={deleteQuote.bind(null, projectId, quote.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Verwijderen
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
            <Label htmlFor={`supplier-${category.id}`}>Leverancier</Label>
            <Select name="supplier_id">
              <SelectTrigger id={`supplier-${category.id}`}>
                <SelectValue placeholder="Kies leverancier" />
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
            <Label htmlFor={`cost_price-${category.id}`}>Inkoopprijs (optioneel)</Label>
            <Input
              id={`cost_price-${category.id}`}
              name="cost_price"
              type="number"
              step="0.01"
              placeholder="Nog onbekend? Laat leeg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`quote_status-${category.id}`}>Status</Label>
            <Select name="status" defaultValue="aangevraagd">
              <SelectTrigger id={`quote_status-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" className="self-end">
            Offerte toevoegen
          </Button>
        </form>

        {clientPrice !== null && (
          <p className="text-sm">
            Klantprijs: <span className="font-semibold">&euro; {clientPrice.toFixed(2)}</span>{" "}
            <span className="text-muted-foreground">
              (inkoop &euro; {chosenQuote!.cost_price.toFixed(2)} + marge &euro;{" "}
              {(clientPrice - chosenQuote!.cost_price).toFixed(2)})
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
