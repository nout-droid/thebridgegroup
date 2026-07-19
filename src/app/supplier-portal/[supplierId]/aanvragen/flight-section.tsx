import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CrewMember } from "@/lib/types";
import { updateSupplierCrewFlightDetails } from "../requests-actions";

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}

export function SupplierFlightSection({
  supplierId,
  projectId,
  members,
}: {
  supplierId: string;
  projectId: string;
  members: CrewMember[];
}) {
  const flightMembers = members.filter((member) => member.needs_flight);

  if (flightMembers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vluchten</CardTitle>
        <p className="text-sm text-muted-foreground">
          Deze crewleden hebben een vliegticket nodig. Vul aan zodra bekend, ook als het pas
          later compleet is.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {flightMembers.map((member) => (
          <form
            key={member.id}
            action={updateSupplierCrewFlightDetails.bind(null, supplierId, projectId, member.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
          >
            <div className="sm:col-span-4">
              <p className="text-sm font-medium">{member.name || "Naam volgt"}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`passport-${member.id}`} className="text-xs">Paspoortnummer</Label>
              <Input
                id={`passport-${member.id}`}
                name="passport_number"
                defaultValue={member.passport_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`departure-airport-${member.id}`} className="text-xs">Vertrekluchthaven</Label>
              <Input
                id={`departure-airport-${member.id}`}
                name="flight_departure_airport"
                defaultValue={member.flight_departure_airport}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`destination-${member.id}`} className="text-xs">Bestemming</Label>
              <Input
                id={`destination-${member.id}`}
                name="flight_destination"
                defaultValue={member.flight_destination}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`departure-at-${member.id}`} className="text-xs">Vertrek datum/tijd</Label>
              <Input
                id={`departure-at-${member.id}`}
                name="flight_departure_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(member.flight_departure_at)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`return-at-${member.id}`} className="text-xs">Retour datum/tijd</Label>
              <Input
                id={`return-at-${member.id}`}
                name="flight_return_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(member.flight_return_at)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`booking-${member.id}`} className="text-xs">Boekingsnummer</Label>
              <Input
                id={`booking-${member.id}`}
                name="flight_booking_number"
                defaultValue={member.flight_booking_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ticket-${member.id}`} className="text-xs">Ticketnummer</Label>
              <Input
                id={`ticket-${member.id}`}
                name="flight_ticket_number"
                defaultValue={member.flight_ticket_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end sm:col-span-4">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
            </div>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
