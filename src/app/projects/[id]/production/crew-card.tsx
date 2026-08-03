import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CrewMember, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { AccessDatesInput } from "@/components/access-dates-input";
import { addCrewMember, deleteCrewMember, updateCrewMember } from "./crew-actions";
import { FreelancerPicker, type FreelancerOption } from "./freelancer-picker";
import type { Translator } from "@/lib/server/translate";

export const CREW_CARD_LABELS = [
  "Crew & Accreditatie",
  "Alle badges downloaden",
  "Uren",
  "Wie is er, van welke leverancier, en is de accreditatie geregeld.",
  "Positie:",
  "Uit artiestenrider",
  "Naam",
  "Leverancier",
  "Kies leverancier",
  "Functie",
  "Toegangsniveau",
  "ID-nummer",
  "Geaccrediteerd",
  "Catering nodig",
  "Hotel nodig",
  "Vliegticket nodig",
  "Toegangsdagen",
  "Opslaan",
  "Verwijderen",
  "Badge",
  "Crewlid toevoegen",
  "Skills (komma-gescheiden)",
  "Bv. FOH, monitoren, rigging",
  "Dagtarief (€)",
  "Overurentarief (€/uur)",
  "Overuren",
  "Woonadres",
  "KM-tarief (€/km)",
  "Reisafstand (enkele reis):",
  "Vergoeding landt automatisch in de begroting onder \"Crew vergoeding\".",
  "Kies uit crewdatabase",
  "Handmatig invoeren",
];

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function computeCrewCost(member: CrewMember): number {
  const days = member.access_dates.length;
  const dayCost = member.day_rate * days;
  const overtimeCost = member.overtime_rate * member.overtime_hours;
  const kmCost = member.km_rate * (member.distance_km ?? 0) * 2 * days;
  return dayCost + overtimeCost + kmCost;
}

const identity: Translator = (text) => text;

export function CrewCard({
  projectId,
  members,
  suppliers,
  freelancers,
  t = identity,
}: {
  projectId: string;
  members: CrewMember[];
  suppliers: Supplier[];
  freelancers: FreelancerOption[];
  t?: Translator;
}) {
  const pickerLabels = {
    fromDatabase: t("Kies uit crewdatabase"),
    manualEntry: t("Handmatig invoeren"),
    name: t("Naam"),
    role: t("Functie"),
    homeAddress: t("Woonadres"),
    dayRate: t("Dagtarief (€)"),
    overtimeRate: t("Overurentarief (€/uur)"),
    kmRate: t("KM-tarief (€/km)"),
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Crew & Accreditatie")}</CardTitle>
          {members.length > 0 && (
            <div className="flex items-center gap-3">
              <a
                href={`/projects/${projectId}/production/crew/hours`}
                className="text-sm text-primary underline"
              >
                {t("Uren")}
              </a>
              <a
                href={`/projects/${projectId}/production/crew/badges`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                {t("Alle badges downloaden")}
              </a>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("Wie is er, van welke leverancier, en is de accreditatie geregeld.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <form
            key={member.id}
            action={updateCrewMember.bind(null, projectId, member.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-6"
          >
            {(member.crew_position_id || member.artist_rider_id) && (
              <div className="flex flex-wrap items-center gap-1.5 sm:col-span-6">
                {member.crew_position_id && (
                  <Badge variant="secondary" className="text-[10px]">{t("Positie:")} {member.role || "—"}</Badge>
                )}
                {member.artist_rider_id && (
                  <Badge variant="secondary" className="text-[10px]">{t("Uit artiestenrider")}</Badge>
                )}
              </div>
            )}
            <FreelancerPicker
              freelancers={freelancers}
              defaultFreelancerId={member.freelancer_id}
              defaults={{
                name: member.name,
                role: member.role,
                home_address: member.home_address,
                day_rate: member.day_rate,
                overtime_rate: member.overtime_rate,
                km_rate: member.km_rate,
              }}
              idPrefix={`existing-${member.id}`}
              labels={pickerLabels}
            />
            <div className="space-y-1">
              <Label htmlFor={`supplier-${member.id}`} className="text-xs">{t("Leverancier")}</Label>
              <SupplierSelect
                id={`supplier-${member.id}`}
                defaultValue={member.supplier_id ?? undefined}
                suppliers={suppliers}
                placeholder={t("Kies leverancier")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`access-${member.id}`} className="text-xs">{t("Toegangsniveau")}</Label>
              <Input
                id={`access-${member.id}`}
                name="access_level"
                defaultValue={member.access_level}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`idnum-${member.id}`} className="text-xs">{t("ID-nummer")}</Label>
              <Input
                id={`idnum-${member.id}`}
                name="id_number"
                defaultValue={member.id_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="accredited"
                  defaultChecked={member.accredited}
                  className="h-4 w-4"
                />
                {t("Geaccrediteerd")}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="needs_catering"
                  defaultChecked={member.needs_catering}
                  className="h-4 w-4"
                />
                {t("Catering nodig")}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="needs_hotel"
                  defaultChecked={member.needs_hotel}
                  className="h-4 w-4"
                />
                {t("Hotel nodig")}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="needs_flight"
                  defaultChecked={member.needs_flight}
                  className="h-4 w-4"
                />
                {t("Vliegticket nodig")}
              </label>
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs">{t("Toegangsdagen")}</Label>
              <AccessDatesInput defaultValues={member.access_dates} />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor={`skills-${member.id}`} className="text-xs">{t("Skills (komma-gescheiden)")}</Label>
              <Input
                id={`skills-${member.id}`}
                name="skills"
                defaultValue={member.skills.join(", ")}
                placeholder={t("Bv. FOH, monitoren, rigging")}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ot-hours-${member.id}`} className="text-xs">{t("Overuren")}</Label>
              <Input
                id={`ot-hours-${member.id}`}
                name="overtime_hours"
                type="number"
                step="0.5"
                min="0"
                defaultValue={member.overtime_hours || undefined}
                className="h-8 text-xs"
              />
            </div>
            {(member.day_rate > 0 || member.overtime_rate > 0 || member.distance_km !== null) && (
              <p className="text-xs text-muted-foreground sm:col-span-6">
                {member.distance_km !== null && (
                  <>{t("Reisafstand (enkele reis):")} {member.distance_km} km · </>
                )}
                {euro(computeCrewCost(member))}
              </p>
            )}
            <div className="flex items-end gap-2 sm:col-span-6">
              <Button type="submit" size="sm" className="h-8 text-xs">
                {t("Opslaan")}
              </Button>
              <Button
                type="submit"
                formAction={deleteCrewMember.bind(null, projectId, member.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                {t("Verwijderen")}
              </Button>
              <a
                href={`/projects/${projectId}/production/crew/${member.id}/badge`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary underline"
              >
                {t("Badge")}
              </a>
            </div>
          </form>
        ))}

        <form
          action={addCrewMember.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <FreelancerPicker freelancers={freelancers} idPrefix="new" labels={pickerLabels} />
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">{t("Leverancier")}</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} placeholder={t("Kies leverancier")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-access" className="text-xs">{t("Toegangsniveau")}</Label>
            <Input id="new-access" name="access_level" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-idnum" className="text-xs">{t("ID-nummer")}</Label>
            <Input id="new-idnum" name="id_number" className="h-8 text-xs" />
          </div>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="accredited" className="h-4 w-4" />
              {t("Geaccrediteerd")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="needs_catering" className="h-4 w-4" />
              {t("Catering nodig")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="needs_hotel" className="h-4 w-4" />
              {t("Hotel nodig")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="needs_flight" className="h-4 w-4" />
              {t("Vliegticket nodig")}
            </label>
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label className="text-xs">{t("Toegangsdagen")}</Label>
            <AccessDatesInput />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="new-skills" className="text-xs">{t("Skills (komma-gescheiden)")}</Label>
            <Input id="new-skills" name="skills" placeholder={t("Bv. FOH, monitoren, rigging")} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-ot-hours" className="text-xs">{t("Overuren")}</Label>
            <Input id="new-ot-hours" name="overtime_hours" type="number" step="0.5" min="0" className="h-8 text-xs" />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-6">
            {t('Vergoeding landt automatisch in de begroting onder "Crew vergoeding".')}
          </p>
          <div className="sm:col-span-6">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {t("Crewlid toevoegen")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
