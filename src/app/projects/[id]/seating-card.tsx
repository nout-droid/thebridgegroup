import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EventGuest, SeatingTable, Stage } from "@/lib/types";
import { StageSelect } from "./stage-select";
import {
  addSeatingTable,
  assignGuestToTable,
  deleteSeatingTable,
  updateSeatingTable,
} from "./seating-actions";
import type { Translator } from "@/lib/server/translate";

export const SEATING_CARD_LABELS = [
  "Tafelindeling",
  "Wijs gasten toe aan tafels — handig bij een seated diner. Capaciteit inclusief +1's wordt bewaakt.",
  "Tafelindeling downloaden (PDF)",
  "Kies podium",
  "Opmerkingen",
  "personen",
  "vol",
  "Opslaan",
  "Verwijderen",
  "Geen tafel",
  "Naam",
  "Capaciteit",
  "Tafel toevoegen",
  "Niet ingedeeld",
  "Kies tafel",
];

const identity: Translator = (text) => text;

function guestHeadcount(guest: EventGuest): number {
  return 1 + guest.plus_ones;
}

export function SeatingCard({
  projectId,
  tables,
  guests,
  stages,
  t = identity,
}: {
  projectId: string;
  tables: SeatingTable[];
  guests: EventGuest[];
  stages: Stage[];
  t?: Translator;
}) {
  const sortedTables = [...tables].sort((a, b) => a.sort_order - b.sort_order);
  const unassigned = guests.filter((g) => !g.table_id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Tafelindeling")}</CardTitle>
          {sortedTables.length > 0 && (
            <a
              href={`/projects/${projectId}/guests/seating-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {t("Tafelindeling downloaden (PDF)")}
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            "Wijs gasten toe aan tafels — handig bij een seated diner. Capaciteit inclusief +1's wordt bewaakt."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTables.map((table) => {
          const tableGuests = guests.filter((g) => g.table_id === table.id);
          const occupied = tableGuests.reduce((sum, g) => sum + guestHeadcount(g), 0);
          const over = occupied > table.capacity;
          return (
            <div key={table.id} className="space-y-2 rounded-md border p-3">
              <form
                action={updateSeatingTable.bind(null, projectId, table.id)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-6"
              >
                <Input name="name" defaultValue={table.name} className="h-8 text-xs sm:col-span-2" required />
                <Input
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={table.capacity}
                  className="h-8 text-xs"
                />
                <StageSelect
                  id={`table-stage-${table.id}`}
                  defaultValue={table.stage_id ?? undefined}
                  stages={stages}
                  placeholder={t("Kies podium")}
                />
                <Input
                  name="notes"
                  defaultValue={table.notes}
                  placeholder={t("Opmerkingen")}
                  className="h-8 text-xs sm:col-span-2"
                />
                <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
                  <Badge variant={over ? "destructive" : "secondary"} className="text-xs">
                    {occupied}/{table.capacity} {t("personen")}
                    {over ? ` — ${t("vol")}` : ""}
                  </Badge>
                  <Button type="submit" size="sm" className="h-7 text-xs">
                    {t("Opslaan")}
                  </Button>
                  <Button
                    type="submit"
                    formAction={deleteSeatingTable.bind(null, projectId, table.id)}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                  >
                    {t("Verwijderen")}
                  </Button>
                </div>
              </form>
              {tableGuests.length > 0 && (
                <ul className="space-y-1 pl-1 text-xs text-muted-foreground">
                  {tableGuests.map((guest) => (
                    <li key={guest.id} className="flex items-center justify-between gap-2">
                      <span>
                        {guest.name}
                        {guest.plus_ones > 0 && ` (+${guest.plus_ones})`}
                      </span>
                      <form action={assignGuestToTable.bind(null, projectId, guest.id)}>
                        <input type="hidden" name="table_id" value="" />
                        <Button type="submit" size="sm" variant="ghost" className="h-6 text-xs">
                          {t("Geen tafel")}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <form
          action={addSeatingTable.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <Input name="name" placeholder={t("Naam")} required className="h-9 sm:col-span-2" />
          <Input name="capacity" type="number" min={1} defaultValue={8} placeholder={t("Capaciteit")} className="h-9" />
          <StageSelect id="new-table-stage" stages={stages} placeholder={t("Kies podium")} />
          <Input name="notes" placeholder={t("Opmerkingen")} className="h-9 sm:col-span-2" />
          <Button type="submit" className="sm:col-span-6">
            {t("Tafel toevoegen")}
          </Button>
        </form>

        {unassigned.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">{t("Niet ingedeeld")}</p>
            <ul className="space-y-1">
              {unassigned.map((guest) => (
                <li
                  key={guest.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span>
                    {guest.name}
                    {guest.plus_ones > 0 && ` (+${guest.plus_ones})`}
                  </span>
                  <form
                    action={assignGuestToTable.bind(null, projectId, guest.id)}
                    className="flex items-center gap-1.5"
                  >
                    <select
                      name="table_id"
                      defaultValue=""
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="">{t("Kies tafel")}</option>
                      {sortedTables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                      {t("Opslaan")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
