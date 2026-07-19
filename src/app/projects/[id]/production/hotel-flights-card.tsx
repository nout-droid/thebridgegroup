import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Category, CrewMember, Quote, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { saveHotelCost, setSuppliersManageTravel, updateCrewPerDiem } from "./hotel-actions";
import { saveFlightCost, updateCrewFlightDetails } from "./flight-actions";
import { computeNights } from "@/lib/nights";

function SupplierAccessToggle({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <form action={setSuppliersManageTravel.bind(null, projectId)} className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="suppliers_manage_travel" defaultChecked={enabled} className="h-4 w-4" />
            Leveranciers mogen de hotel- en vluchtgegevens van hun eigen crew zelf invullen
          </label>
          <Button type="submit" size="sm" variant="secondary">
            Opslaan
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Staat dit aan, dan zien leveranciers een Hotel- en Vluchten-sectie bij hun aanvragen,
          beperkt tot hun eigen crewleden.
        </p>
      </CardContent>
    </Card>
  );
}

function CostForm({
  action,
  idPrefix,
  suppliers,
  category,
  quote,
}: {
  action: (formData: FormData) => void;
  idPrefix: string;
  suppliers: Supplier[];
  category: Category | null;
  quote: Quote | null;
}) {
  return (
    <form action={action} className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-supplier`} className="text-xs">Leverancier</Label>
        <SupplierSelect id={`${idPrefix}-supplier`} defaultValue={quote?.supplier_id ?? undefined} suppliers={suppliers} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-cost`} className="text-xs">Inkoopprijs</Label>
        <Input
          id={`${idPrefix}-cost`}
          name="cost_price"
          type="number"
          step="0.01"
          min={0}
          defaultValue={quote?.cost_price ?? undefined}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-margin-type`} className="text-xs">Marge type</Label>
        <select
          id={`${idPrefix}-margin-type`}
          name="margin_type"
          defaultValue={category?.margin_type ?? "percentage"}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Vast bedrag</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-margin-value`} className="text-xs">Marge waarde</Label>
        <Input
          id={`${idPrefix}-margin-value`}
          name="margin_value"
          type="number"
          step="0.01"
          defaultValue={category?.margin_value ?? 0}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex items-end sm:col-span-4">
        <Button type="submit" size="sm" className="h-8 text-xs">
          Opslaan
        </Button>
      </div>
    </form>
  );
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function FlightsSection({
  projectId,
  members,
  suppliers,
  flightCategory,
  flightQuote,
}: {
  projectId: string;
  members: CrewMember[];
  suppliers: Supplier[];
  flightCategory: Category | null;
  flightQuote: Quote | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Vluchten</CardTitle>
          {members.length > 0 && (
            <a
              href={`/projects/${projectId}/production/flight/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              Vluchtaanvraag downloaden (PDF)
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Iedereen met "Vliegticket nodig" aangevinkt op de accreditatiekaart. Details komen
          vaak pas later binnen — vul aan zodra bekend.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Niemand heeft op dit moment een vliegticket nodig.</p>
        ) : (
          members.map((member) => (
            <form
              key={member.id}
              action={updateCrewFlightDetails.bind(null, projectId, member.id)}
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
          ))
        )}

        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">Vluchtkosten</p>
          <CostForm
            action={saveFlightCost.bind(null, projectId)}
            idPrefix="flight-cost"
            suppliers={suppliers}
            category={flightCategory}
            quote={flightQuote}
          />
          {flightQuote && (
            <p className="text-xs text-muted-foreground">
              Staat al in de begroting als categorie "Vluchten" — wijzigingen hier passen 'm meteen aan.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HotelSection({
  projectId,
  members,
  suppliers,
  hotelCategory,
  hotelQuote,
}: {
  projectId: string;
  members: CrewMember[];
  suppliers: Supplier[];
  hotelCategory: Category | null;
  hotelQuote: Quote | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hotel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Iedereen met "Hotel nodig" aangevinkt (via Planning, Crew & Accreditatie, of
          Artiestenriders), met check-in/check-out afgeleid uit hun toegangsdagen.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Niemand heeft op dit moment een hotel nodig.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Naam</th>
                  <th className="p-2 text-left font-medium">Functie</th>
                  <th className="p-2 text-left font-medium">Check-in</th>
                  <th className="p-2 text-left font-medium">Check-out</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const dates = [...member.access_dates].sort();
                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="p-2">{member.name || "Naam volgt"}</td>
                      <td className="p-2">{member.role || "—"}</td>
                      <td className="p-2">{dates[0] ?? "—"}</td>
                      <td className="p-2">{dates[dates.length - 1] ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {members.length > 0 && (
          <a
            href={`/projects/${projectId}/production/hotel/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            Hotelaanvraag downloaden (PDF)
          </a>
        )}

        {members.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">Sejourskosten per persoon</p>
            <p className="text-xs text-muted-foreground">
              Dagvergoeding voor iedereen die in het hotel zit — telt automatisch mee in de
              begroting als categorie "Sejours".
            </p>
            <div className="space-y-2">
              {members.map((member) => {
                const nights = computeNights(member.access_dates ?? []);
                const total = nights * (member.per_diem_rate ?? 0);
                return (
                  <form
                    key={member.id}
                    action={updateCrewPerDiem.bind(null, projectId, member.id)}
                    className="flex flex-wrap items-end gap-3 rounded-md border p-2"
                  >
                    <p className="min-w-0 flex-1 truncate text-xs font-medium">
                      {member.name || "Naam volgt"} <span className="text-muted-foreground">({nights}n)</span>
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor={`perdiem-${member.id}`} className="text-xs">€ per nacht</Label>
                      <Input
                        id={`perdiem-${member.id}`}
                        name="per_diem_rate"
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={member.per_diem_rate}
                        className="h-8 w-24 text-xs"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Totaal: € {total.toFixed(2)}</p>
                    <Button type="submit" size="sm" className="h-8 text-xs">
                      Opslaan
                    </Button>
                  </form>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">Hotelkosten</p>
          <CostForm
            action={saveHotelCost.bind(null, projectId)}
            idPrefix="hotel-cost"
            suppliers={suppliers}
            category={hotelCategory}
            quote={hotelQuote}
          />
          {hotelQuote && (
            <p className="text-xs text-muted-foreground">
              Staat al in de begroting als categorie "Hotel" — wijzigingen hier passen 'm meteen aan.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function HotelFlightsCard({
  projectId,
  hotelMembers,
  flightMembers,
  suppliersManageTravel,
  suppliers,
  hotelCategory,
  hotelQuote,
  flightCategory,
  flightQuote,
}: {
  projectId: string;
  hotelMembers: CrewMember[];
  flightMembers: CrewMember[];
  suppliersManageTravel: boolean;
  suppliers: Supplier[];
  hotelCategory: Category | null;
  hotelQuote: Quote | null;
  flightCategory: Category | null;
  flightQuote: Quote | null;
}) {
  return (
    <div className="space-y-6">
      <SupplierAccessToggle projectId={projectId} enabled={suppliersManageTravel} />
      <HotelSection
        projectId={projectId}
        members={hotelMembers}
        suppliers={suppliers}
        hotelCategory={hotelCategory}
        hotelQuote={hotelQuote}
      />
      <FlightsSection
        projectId={projectId}
        members={flightMembers}
        suppliers={suppliers}
        flightCategory={flightCategory}
        flightQuote={flightQuote}
      />
    </div>
  );
}
