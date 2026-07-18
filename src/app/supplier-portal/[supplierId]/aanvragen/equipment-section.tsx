import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { EquipmentReservation } from "@/lib/types";
import {
  addSupplierEquipment,
  deleteSupplierEquipment,
  updateSupplierEquipment,
} from "../requests-actions";

export function SupplierEquipmentSection({
  supplierId,
  projectId,
  reservations,
}: {
  supplierId: string;
  projectId: string;
  reservations: EquipmentReservation[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Materieel</CardTitle>
        <p className="text-sm text-muted-foreground">Machines die je voor dit project reserveert.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {reservations.map((item) => (
          <form
            key={item.id}
            action={updateSupplierEquipment.bind(null, supplierId, projectId, item.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-5"
          >
            <div className="space-y-1">
              <Label htmlFor={`type-${item.id}`} className="text-xs">Type machine</Label>
              <Input
                id={`type-${item.id}`}
                name="machine_type"
                defaultValue={item.machine_type}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`qty-${item.id}`} className="text-xs">Aantal</Label>
              <Input
                id={`qty-${item.id}`}
                name="quantity"
                type="number"
                min={1}
                defaultValue={item.quantity}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`acc-${item.id}`} className="text-xs">Accessoires</Label>
              <Input
                id={`acc-${item.id}`}
                name="accessories"
                defaultValue={item.accessories}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`date-${item.id}`} className="text-xs">Datum</Label>
              <Input
                id={`date-${item.id}`}
                name="reservation_date"
                type="date"
                defaultValue={item.reservation_date ?? ""}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`duration-${item.id}`} className="text-xs">Duur</Label>
              <Input
                id={`duration-${item.id}`}
                name="duration"
                defaultValue={item.duration}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`num-${item.id}`} className="text-xs">Machinenummer</Label>
              <Input
                id={`num-${item.id}`}
                name="machine_number"
                defaultValue={item.machine_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-5">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteSupplierEquipment.bind(null, supplierId, projectId, item.id)}
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
          action={addSupplierEquipment.bind(null, supplierId, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-5"
        >
          <div className="space-y-1">
            <Label htmlFor="new-type" className="text-xs">Type machine</Label>
            <Input id="new-type" name="machine_type" placeholder="bv. Manitou" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-qty" className="text-xs">Aantal</Label>
            <Input id="new-qty" name="quantity" type="number" min={1} defaultValue={1} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-acc" className="text-xs">Accessoires</Label>
            <Input id="new-acc" name="accessories" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-date" className="text-xs">Datum</Label>
            <Input id="new-date" name="reservation_date" type="date" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-duration" className="text-xs">Duur</Label>
            <Input id="new-duration" name="duration" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-num" className="text-xs">Machinenummer</Label>
            <Input id="new-num" name="machine_number" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Reservering toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
