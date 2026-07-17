import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CateringOrder } from "@/lib/types";
import { addCateringOrder, deleteCateringOrder, updateCateringOrder } from "./catering-actions";

function sortOrders(orders: CateringOrder[]): CateringOrder[] {
  return [...orders].sort((a, b) => {
    if (a.order_date !== b.order_date) return a.order_date < b.order_date ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

export function CateringCard({
  projectId,
  orders,
}: {
  projectId: string;
  orders: CateringOrder[];
}) {
  const sorted = sortOrders(orders);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Catering</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aantallen per dag en afnemer, voor lunch, diner en night snacks.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((order) => (
          <form
            key={order.id}
            action={updateCateringOrder.bind(null, projectId, order.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-8"
          >
            <div className="space-y-1">
              <Label htmlFor={`date-${order.id}`} className="text-xs">Datum</Label>
              <Input
                id={`date-${order.id}`}
                name="order_date"
                type="date"
                defaultValue={order.order_date}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`party-${order.id}`} className="text-xs">Afnemer</Label>
              <Input
                id={`party-${order.id}`}
                name="party"
                defaultValue={order.party}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`cl-${order.id}`} className="text-xs">Crew lunch</Label>
              <Input
                id={`cl-${order.id}`}
                name="crew_lunch"
                type="number"
                min={0}
                defaultValue={order.crew_lunch}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`vl-${order.id}`} className="text-xs">Veggie lunch</Label>
              <Input
                id={`vl-${order.id}`}
                name="veggie_lunch"
                type="number"
                min={0}
                defaultValue={order.veggie_lunch}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`cd-${order.id}`} className="text-xs">Crew diner</Label>
              <Input
                id={`cd-${order.id}`}
                name="crew_dinner"
                type="number"
                min={0}
                defaultValue={order.crew_dinner}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`vd-${order.id}`} className="text-xs">Veggie diner</Label>
              <Input
                id={`vd-${order.id}`}
                name="veggie_dinner"
                type="number"
                min={0}
                defaultValue={order.veggie_dinner}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ns-${order.id}`} className="text-xs">Night snacks</Label>
              <Input
                id={`ns-${order.id}`}
                name="night_snacks"
                type="number"
                min={0}
                defaultValue={order.night_snacks}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`notes-${order.id}`} className="text-xs">Opmerkingen</Label>
              <Input
                id={`notes-${order.id}`}
                name="notes"
                defaultValue={order.notes}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-8">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteCateringOrder.bind(null, projectId, order.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </div>
          </form>
        ))}

        <form
          action={addCateringOrder.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-8"
        >
          <div className="space-y-1">
            <Label htmlFor="new-date" className="text-xs">Datum</Label>
            <Input id="new-date" name="order_date" type="date" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-party" className="text-xs">Afnemer</Label>
            <Input id="new-party" name="party" placeholder="bv. Think" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-cl" className="text-xs">Crew lunch</Label>
            <Input id="new-cl" name="crew_lunch" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-vl" className="text-xs">Veggie lunch</Label>
            <Input id="new-vl" name="veggie_lunch" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-cd" className="text-xs">Crew diner</Label>
            <Input id="new-cd" name="crew_dinner" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-vd" className="text-xs">Veggie diner</Label>
            <Input id="new-vd" name="veggie_dinner" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-ns" className="text-xs">Night snacks</Label>
            <Input id="new-ns" name="night_snacks" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="new-notes" className="text-xs">Opmerkingen</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
          <div className="sm:col-span-8">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Order toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
