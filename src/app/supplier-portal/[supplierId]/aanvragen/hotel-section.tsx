import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccessDatesInput } from "@/components/access-dates-input";
import type { CrewMember } from "@/lib/types";
import { updateSupplierCrewHotelDetails } from "../requests-actions";

export function SupplierHotelSection({
  supplierId,
  projectId,
  members,
}: {
  supplierId: string;
  projectId: string;
  members: CrewMember[];
}) {
  const hotelMembers = members.filter((member) => member.needs_hotel);

  if (hotelMembers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hotel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Deze crewleden hebben een hotel nodig. Vul de check-in/check-out in via de
          toegangsdagen — de eerste en laatste dag worden gebruikt als check-in/check-out.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {hotelMembers.map((member) => (
          <form
            key={member.id}
            action={updateSupplierCrewHotelDetails.bind(null, supplierId, projectId, member.id)}
            className="space-y-2 rounded-md border p-3"
          >
            <p className="text-sm font-medium">{member.name || "Naam volgt"}</p>
            <AccessDatesInput defaultValues={member.access_dates} />
            <Button type="submit" size="sm" className="h-8 text-xs">
              Opslaan
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
