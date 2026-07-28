import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Category, CrewMember, Quote, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { saveHotelCost, setSuppliersManageTravel, updateCrewPerDiem } from "./hotel-actions";
import { saveFlightCost, updateCrewFlightDetails } from "./flight-actions";
import { computeNights } from "@/lib/nights";
import type { Translator } from "@/lib/server/translate";

export const HOTEL_FLIGHTS_CARD_LABELS = [
  "Leveranciers mogen de hotel- en vluchtgegevens van hun eigen crew zelf invullen",
  "Opslaan",
  "Staat dit aan, dan zien leveranciers een Hotel- en Vluchten-sectie bij hun aanvragen, beperkt tot hun eigen crewleden.",
  "Leverancier",
  "Kies leverancier",
  "Inkoopprijs",
  "Marge type",
  "Percentage",
  "Vast bedrag",
  "Marge waarde",
  "Vluchten",
  "Vluchtaanvraag downloaden (PDF)",
  "Iedereen met \"Vliegticket nodig\" aangevinkt op de accreditatiekaart. Details komen vaak pas later binnen — vul aan zodra bekend.",
  "Niemand heeft op dit moment een vliegticket nodig.",
  "Naam volgt",
  "Paspoortnummer",
  "Vertrekluchthaven",
  "Bestemming",
  "Vertrek datum/tijd",
  "Retour datum/tijd",
  "Boekingsnummer",
  "Ticketnummer",
  "Vluchtkosten",
  "Staat al in de begroting als categorie \"Vluchten\" — wijzigingen hier passen 'm meteen aan.",
  "Hotel",
  "Iedereen met \"Hotel nodig\" aangevinkt (via Planning, Crew & Accreditatie, of Artiestenriders), met check-in/check-out afgeleid uit hun toegangsdagen.",
  "Niemand heeft op dit moment een hotel nodig.",
  "Naam",
  "Functie",
  "Check-in",
  "Check-out",
  "Hotelaanvraag downloaden (PDF)",
  "Sejourskosten per persoon",
  "Dagvergoeding voor iedereen die in het hotel zit — telt automatisch mee in de begroting als categorie \"Sejours\".",
  "€ per nacht",
  "Totaal:",
  "Hotelkosten",
  "Staat al in de begroting als categorie \"Hotel\" — wijzigingen hier passen 'm meteen aan.",
];

const identity: Translator = (text) => text;

function SupplierAccessToggle({
  projectId,
  enabled,
  t,
}: {
  projectId: string;
  enabled: boolean;
  t: Translator;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <form action={setSuppliersManageTravel.bind(null, projectId)} className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="suppliers_manage_travel" defaultChecked={enabled} className="h-4 w-4" />
            {t("Leveranciers mogen de hotel- en vluchtgegevens van hun eigen crew zelf invullen")}
          </label>
          <Button type="submit" size="sm" variant="secondary">
            {t("Opslaan")}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          {t(
            "Staat dit aan, dan zien leveranciers een Hotel- en Vluchten-sectie bij hun aanvragen, beperkt tot hun eigen crewleden."
          )}
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
  t,
}: {
  action: (formData: FormData) => void;
  idPrefix: string;
  suppliers: Supplier[];
  category: Category | null;
  quote: Quote | null;
  t: Translator;
}) {
  return (
    <form action={action} className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-supplier`} className="text-xs">{t("Leverancier")}</Label>
        <SupplierSelect
          id={`${idPrefix}-supplier`}
          defaultValue={quote?.supplier_id ?? undefined}
          suppliers={suppliers}
          placeholder={t("Kies leverancier")}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-cost`} className="text-xs">{t("Inkoopprijs")}</Label>
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
        <Label htmlFor={`${idPrefix}-margin-type`} className="text-xs">{t("Marge type")}</Label>
        <select
          id={`${idPrefix}-margin-type`}
          name="margin_type"
          defaultValue={category?.margin_type ?? "percentage"}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
        >
          <option value="percentage">{t("Percentage")}</option>
          <option value="fixed">{t("Vast bedrag")}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-margin-value`} className="text-xs">{t("Marge waarde")}</Label>
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
          {t("Opslaan")}
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
  t,
}: {
  projectId: string;
  members: CrewMember[];
  suppliers: Supplier[];
  flightCategory: Category | null;
  flightQuote: Quote | null;
  t: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Vluchten")}</CardTitle>
          {members.length > 0 && (
            <a
              href={`/projects/${projectId}/production/flight/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {t("Vluchtaanvraag downloaden (PDF)")}
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'Iedereen met "Vliegticket nodig" aangevinkt op de accreditatiekaart. Details komen vaak pas later binnen — vul aan zodra bekend.'
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Niemand heeft op dit moment een vliegticket nodig.")}</p>
        ) : (
          members.map((member) => (
            <form
              key={member.id}
              action={updateCrewFlightDetails.bind(null, projectId, member.id)}
              className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
            >
              <div className="sm:col-span-4">
                <p className="text-sm font-medium">{member.name || t("Naam volgt")}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`passport-${member.id}`} className="text-xs">{t("Paspoortnummer")}</Label>
                <Input
                  id={`passport-${member.id}`}
                  name="passport_number"
                  defaultValue={member.passport_number}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`departure-airport-${member.id}`} className="text-xs">{t("Vertrekluchthaven")}</Label>
                <Input
                  id={`departure-airport-${member.id}`}
                  name="flight_departure_airport"
                  defaultValue={member.flight_departure_airport}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`destination-${member.id}`} className="text-xs">{t("Bestemming")}</Label>
                <Input
                  id={`destination-${member.id}`}
                  name="flight_destination"
                  defaultValue={member.flight_destination}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`departure-at-${member.id}`} className="text-xs">{t("Vertrek datum/tijd")}</Label>
                <Input
                  id={`departure-at-${member.id}`}
                  name="flight_departure_at"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(member.flight_departure_at)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`return-at-${member.id}`} className="text-xs">{t("Retour datum/tijd")}</Label>
                <Input
                  id={`return-at-${member.id}`}
                  name="flight_return_at"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(member.flight_return_at)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`booking-${member.id}`} className="text-xs">{t("Boekingsnummer")}</Label>
                <Input
                  id={`booking-${member.id}`}
                  name="flight_booking_number"
                  defaultValue={member.flight_booking_number}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ticket-${member.id}`} className="text-xs">{t("Ticketnummer")}</Label>
                <Input
                  id={`ticket-${member.id}`}
                  name="flight_ticket_number"
                  defaultValue={member.flight_ticket_number}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-end sm:col-span-4">
                <Button type="submit" size="sm" className="h-8 text-xs">
                  {t("Opslaan")}
                </Button>
              </div>
            </form>
          ))
        )}

        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">{t("Vluchtkosten")}</p>
          <CostForm
            action={saveFlightCost.bind(null, projectId)}
            idPrefix="flight-cost"
            suppliers={suppliers}
            category={flightCategory}
            quote={flightQuote}
            t={t}
          />
          {flightQuote && (
            <p className="text-xs text-muted-foreground">
              {t('Staat al in de begroting als categorie "Vluchten" — wijzigingen hier passen \'m meteen aan.')}
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
  t,
}: {
  projectId: string;
  members: CrewMember[];
  suppliers: Supplier[];
  hotelCategory: Category | null;
  hotelQuote: Quote | null;
  t: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Hotel")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            'Iedereen met "Hotel nodig" aangevinkt (via Planning, Crew & Accreditatie, of Artiestenriders), met check-in/check-out afgeleid uit hun toegangsdagen.'
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Niemand heeft op dit moment een hotel nodig.")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">{t("Naam")}</th>
                  <th className="p-2 text-left font-medium">{t("Functie")}</th>
                  <th className="p-2 text-left font-medium">{t("Check-in")}</th>
                  <th className="p-2 text-left font-medium">{t("Check-out")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const dates = [...member.access_dates].sort();
                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="p-2">{member.name || t("Naam volgt")}</td>
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
            {t("Hotelaanvraag downloaden (PDF)")}
          </a>
        )}

        {members.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">{t("Sejourskosten per persoon")}</p>
            <p className="text-xs text-muted-foreground">
              {t(
                'Dagvergoeding voor iedereen die in het hotel zit — telt automatisch mee in de begroting als categorie "Sejours".'
              )}
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
                      {member.name || t("Naam volgt")} <span className="text-muted-foreground">({nights}n)</span>
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor={`perdiem-${member.id}`} className="text-xs">{t("€ per nacht")}</Label>
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
                    <p className="text-xs text-muted-foreground">{t("Totaal:")} € {total.toFixed(2)}</p>
                    <Button type="submit" size="sm" className="h-8 text-xs">
                      {t("Opslaan")}
                    </Button>
                  </form>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">{t("Hotelkosten")}</p>
          <CostForm
            action={saveHotelCost.bind(null, projectId)}
            idPrefix="hotel-cost"
            suppliers={suppliers}
            category={hotelCategory}
            quote={hotelQuote}
            t={t}
          />
          {hotelQuote && (
            <p className="text-xs text-muted-foreground">
              {t('Staat al in de begroting als categorie "Hotel" — wijzigingen hier passen \'m meteen aan.')}
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
  t = identity,
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
  t?: Translator;
}) {
  return (
    <div className="space-y-6">
      <SupplierAccessToggle projectId={projectId} enabled={suppliersManageTravel} t={t} />
      <HotelSection
        projectId={projectId}
        members={hotelMembers}
        suppliers={suppliers}
        hotelCategory={hotelCategory}
        hotelQuote={hotelQuote}
        t={t}
      />
      <FlightsSection
        projectId={projectId}
        members={flightMembers}
        suppliers={suppliers}
        flightCategory={flightCategory}
        flightQuote={flightQuote}
        t={t}
      />
    </div>
  );
}
