import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PowerRequest, Stage, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import { addPowerRequest, deletePowerRequest, updatePowerRequest } from "./power-actions";

export function PowerCard({
  projectId,
  requests,
  stages,
  suppliers,
}: {
  projectId: string;
  requests: PowerRequest[];
  stages: Stage[];
  suppliers: Supplier[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stroom</CardTitle>
        <p className="text-sm text-muted-foreground">
          Stroomaanvragen per podium: wat, hoeveel en op welke positie.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <form
            key={request.id}
            action={updatePowerRequest.bind(null, projectId, request.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-6"
          >
            <div className="space-y-1">
              <Label htmlFor={`stage-${request.id}`} className="text-xs">Podium</Label>
              <StageSelect
                id={`stage-${request.id}`}
                defaultValue={request.stage_id ?? undefined}
                stages={stages}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`desc-${request.id}`} className="text-xs">Wat</Label>
              <Input
                id={`desc-${request.id}`}
                name="description"
                defaultValue={request.description}
                placeholder="bv. 32A 3-fase"
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`qty-${request.id}`} className="text-xs">Aantal</Label>
              <Input
                id={`qty-${request.id}`}
                name="quantity"
                type="number"
                min={1}
                defaultValue={request.quantity}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`pos-${request.id}`} className="text-xs">Positie</Label>
              <Input
                id={`pos-${request.id}`}
                name="position"
                defaultValue={request.position}
                placeholder="bv. Stage links"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`supplier-${request.id}`} className="text-xs">Leverancier</Label>
              <SupplierSelect
                id={`supplier-${request.id}`}
                defaultValue={request.supplier_id ?? undefined}
                suppliers={suppliers}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deletePowerRequest.bind(null, projectId, request.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </div>
            <div className="space-y-1 sm:col-span-6">
              <Label htmlFor={`notes-${request.id}`} className="text-xs">Opmerkingen</Label>
              <Input
                id={`notes-${request.id}`}
                name="notes"
                defaultValue={request.notes}
                className="h-8 text-xs"
              />
            </div>
          </form>
        ))}

        <form
          action={addPowerRequest.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-stage" className="text-xs">Podium</Label>
            <StageSelect id="new-stage" stages={stages} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-desc" className="text-xs">Wat</Label>
            <Input id="new-desc" name="description" placeholder="bv. 32A 3-fase" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-qty" className="text-xs">Aantal</Label>
            <Input id="new-qty" name="quantity" type="number" min={1} defaultValue={1} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-pos" className="text-xs">Positie</Label>
            <Input id="new-pos" name="position" placeholder="bv. Stage links" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">Leverancier</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Aanvraag toevoegen
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-6">
            <Label htmlFor="new-notes" className="text-xs">Opmerkingen</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
