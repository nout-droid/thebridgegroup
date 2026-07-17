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
import type { QuoteLineItem } from "@/lib/types";
import { addQuoteLineItem, deleteQuoteLineItem } from "./actions";

export function QuoteLineItems({
  projectId,
  quoteId,
  lineItems,
}: {
  projectId: string;
  quoteId: string;
  lineItems: QuoteLineItem[];
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">Materiaalregels</p>
      {lineItems.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-7 text-xs">Omschrijving</TableHead>
              <TableHead className="h-7 text-xs">Aantal</TableHead>
              <TableHead className="h-7 text-xs">Stukprijs</TableHead>
              <TableHead className="h-7 text-xs">Totaal</TableHead>
              <TableHead className="h-7" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-1 text-xs">{item.description}</TableCell>
                <TableCell className="py-1 text-xs">{item.quantity}</TableCell>
                <TableCell className="py-1 text-xs">&euro; {item.unit_price.toFixed(2)}</TableCell>
                <TableCell className="py-1 text-xs">
                  &euro; {(item.quantity * item.unit_price).toFixed(2)}
                </TableCell>
                <TableCell className="py-1 text-right">
                  <form action={deleteQuoteLineItem.bind(null, projectId, item.id)}>
                    <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      Verwijderen
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <form
        action={addQuoteLineItem.bind(null, projectId, quoteId)}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <Input name="description" placeholder="Omschrijving" required className="h-8 text-xs" />
        <Input
          name="quantity"
          type="number"
          step="0.01"
          defaultValue={1}
          placeholder="Aantal"
          className="h-8 text-xs"
        />
        <Input
          name="unit_price"
          type="number"
          step="0.01"
          placeholder="Stukprijs"
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
          Regel toevoegen
        </Button>
      </form>
    </div>
  );
}
