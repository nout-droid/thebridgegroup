import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AccessDatesInput } from "@/components/access-dates-input";
import type { CrewMember } from "@/lib/types";
import {
  addSupplierCrewMember,
  deleteSupplierCrewMember,
  updateSupplierCrewMember,
} from "../requests-actions";

export function SupplierCrewSection({
  supplierId,
  projectId,
  members,
}: {
  supplierId: string;
  projectId: string;
  members: CrewMember[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accreditatie</CardTitle>
        <p className="text-sm text-muted-foreground">
          Jouw crew voor dit project, en op welke dagen ze toegang nodig hebben.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <form
            key={member.id}
            action={updateSupplierCrewMember.bind(null, supplierId, projectId, member.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
          >
            <div className="space-y-1">
              <Label htmlFor={`name-${member.id}`} className="text-xs">Naam</Label>
              <Input
                id={`name-${member.id}`}
                name="name"
                defaultValue={member.name}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`role-${member.id}`} className="text-xs">Functie</Label>
              <Input
                id={`role-${member.id}`}
                name="role"
                defaultValue={member.role}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`idnum-${member.id}`} className="text-xs">ID-nummer</Label>
              <Input
                id={`idnum-${member.id}`}
                name="id_number"
                defaultValue={member.id_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteSupplierCrewMember.bind(null, supplierId, projectId, member.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label className="text-xs">Toegangsdagen</Label>
              <AccessDatesInput defaultValues={member.access_dates} />
            </div>
          </form>
        ))}

        <form
          action={addSupplierCrewMember.bind(null, supplierId, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor="new-name" className="text-xs">Naam</Label>
            <Input id="new-name" name="name" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-role" className="text-xs">Functie</Label>
            <Input id="new-role" name="role" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-idnum" className="text-xs">ID-nummer</Label>
            <Input id="new-idnum" name="id_number" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Crewlid toevoegen
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label className="text-xs">Toegangsdagen</Label>
            <AccessDatesInput />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
