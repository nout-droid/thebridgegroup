import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { EquipmentReservation, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import {
  addEquipmentReservation,
  deleteEquipmentReservation,
  updateEquipmentReservation,
} from "./equipment-actions";

export function EquipmentCard({
  projectId,
  reservations,
  suppliers,
}: {
  projectId: string;
  reservations: EquipmentReservation[];
  suppliers: Supplier[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Materieel reservering</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gehuurde machines: van wie, wanneer, en waar ligt de sleutel.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {reservations.length > 0 && (
          <a
            href={`/projects/${projectId}/production/materieel/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            Materieellijst downloaden (PDF)
          </a>
        )}
        {reservations.map((item) => (
          <form
            key={item.id}
            action={updateEquipmentReservation.bind(null, projectId, item.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-6"
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
              <Label htmlFor={`supplier-${item.id}`} className="text-xs">Leverancier</Label>
              <SupplierSelect
                id={`supplier-${item.id}`}
                defaultValue={item.supplier_id ?? undefined}
                suppliers={suppliers}
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
              <Label htmlFor={`date-${item.id}`} className="text-xs">Datum reservering</Label>
              <Input
                id={`date-${item.id}`}
                name="reservation_date"
                type="date"
                defaultValue={item.reservation_date ?? ""}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`duration-${item.id}`} className="text-xs">Benodigde duur</Label>
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
            <div className="space-y-1">
              <Label htmlFor={`key-${item.id}`} className="text-xs">Sleutel bij</Label>
              <Input
                id={`key-${item.id}`}
                name="key_holder"
                defaultValue={item.key_holder}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="picked_up"
                  defaultChecked={item.picked_up}
                  className="h-4 w-4"
                />
                Opgehaald
              </label>
            </div>
            <div className="flex items-end gap-2 sm:col-span-6">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteEquipmentReservation.bind(null, projectId, item.id)}
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
          action={addEquipmentReservation.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-type" className="text-xs">Type machine</Label>
            <Input id="new-type" name="machine_type" placeholder="bv. Manitou" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">Leverancier</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} />
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
            <Label htmlFor="new-date" className="text-xs">Datum reservering</Label>
            <Input id="new-date" name="reservation_date" type="date" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-duration" className="text-xs">Benodigde duur</Label>
            <Input id="new-duration" name="duration" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-num" className="text-xs">Machinenummer</Label>
            <Input id="new-num" name="machine_number" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-key" className="text-xs">Sleutel bij</Label>
            <Input id="new-key" name="key_holder" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="picked_up" className="h-4 w-4" />
              Opgehaald
            </label>
          </div>
          <div className="sm:col-span-6">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Reservering toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
