import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CrewMember, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { addCrewMember, deleteCrewMember, updateCrewMember } from "./crew-actions";

export function CrewCard({
  projectId,
  members,
  suppliers,
}: {
  projectId: string;
  members: CrewMember[];
  suppliers: Supplier[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crew & Accreditatie</CardTitle>
        <p className="text-sm text-muted-foreground">
          Wie is er, van welke leverancier, en is de accreditatie geregeld.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <form
            key={member.id}
            action={updateCrewMember.bind(null, projectId, member.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-6"
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
              <Label htmlFor={`supplier-${member.id}`} className="text-xs">Leverancier</Label>
              <SupplierSelect
                id={`supplier-${member.id}`}
                defaultValue={member.supplier_id ?? undefined}
                suppliers={suppliers}
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
              <Label htmlFor={`access-${member.id}`} className="text-xs">Toegangsniveau</Label>
              <Input
                id={`access-${member.id}`}
                name="access_level"
                defaultValue={member.access_level}
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
            <div className="flex items-end justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="accredited"
                  defaultChecked={member.accredited}
                  className="h-4 w-4"
                />
                Geaccrediteerd
              </label>
            </div>
            <div className="flex items-end gap-2 sm:col-span-6">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteCrewMember.bind(null, projectId, member.id)}
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
          action={addCrewMember.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-name" className="text-xs">Naam</Label>
            <Input id="new-name" name="name" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">Leverancier</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-role" className="text-xs">Functie</Label>
            <Input id="new-role" name="role" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-access" className="text-xs">Toegangsniveau</Label>
            <Input id="new-access" name="access_level" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-idnum" className="text-xs">ID-nummer</Label>
            <Input id="new-idnum" name="id_number" className="h-8 text-xs" />
          </div>
          <div className="flex items-end justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="accredited" className="h-4 w-4" />
              Geaccrediteerd
            </label>
          </div>
          <div className="sm:col-span-6">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Crewlid toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
