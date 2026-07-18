import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PowerRequest, Stage } from "@/lib/types";
import { StageSelect } from "@/app/projects/[id]/stage-select";
import { addSupplierPower, deleteSupplierPower, updateSupplierPower } from "../requests-actions";

export function SupplierPowerSection({
  supplierId,
  projectId,
  stages,
  requests,
}: {
  supplierId: string;
  projectId: string;
  stages: Stage[];
  requests: PowerRequest[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stroom</CardTitle>
        <p className="text-sm text-muted-foreground">
          Wat je nodig hebt, op welk podium en op welke positie.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <form
            key={request.id}
            action={updateSupplierPower.bind(null, supplierId, projectId, request.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-5"
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
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteSupplierPower.bind(null, supplierId, projectId, request.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </div>
            <div className="space-y-1 sm:col-span-5">
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
          action={addSupplierPower.bind(null, supplierId, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-5"
        >
          <div className="space-y-1">
            <Label htmlFor="new-power-stage" className="text-xs">Podium</Label>
            <StageSelect id="new-power-stage" stages={stages} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-power-desc" className="text-xs">Wat</Label>
            <Input
              id="new-power-desc"
              name="description"
              placeholder="bv. 32A 3-fase"
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-power-qty" className="text-xs">Aantal</Label>
            <Input id="new-power-qty" name="quantity" type="number" min={1} defaultValue={1} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-power-pos" className="text-xs">Positie</Label>
            <Input id="new-power-pos" name="position" placeholder="bv. Stage links" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Aanvraag toevoegen
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-5">
            <Label htmlFor="new-power-notes" className="text-xs">Opmerkingen</Label>
            <Input id="new-power-notes" name="notes" className="h-8 text-xs" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
