import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ScheduleItem, Supplier } from "@/lib/types";
import {
  addScheduleItem,
  addScheduleItemSupplier,
  deleteScheduleItem,
  deleteScheduleItemSupplier,
  updateScheduleItem,
} from "./schedule-actions";
import { SupplierSelect } from "./supplier-select";

function sortItems(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => {
    if (a.activity_date !== b.activity_date) return a.activity_date < b.activity_date ? -1 : 1;
    if (a.activity_time !== b.activity_time) return a.activity_time < b.activity_time ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

export function ScheduleCard({
  projectId,
  stageId,
  items,
  suppliers,
}: {
  projectId: string;
  stageId: string | null;
  items: ScheduleItem[];
  suppliers: Supplier[];
}) {
  const sorted = sortItems(items);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Draaiboek</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tijdlijn van activiteiten, van opbouw tot afbraak.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.length > 0 && (
          <a
            href={`/projects/${projectId}/schedule/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            Draaiboek downloaden (PDF)
          </a>
        )}
        {sorted.map((item) => {
          const linkedSuppliers = item.suppliers ?? [];
          const linkedSupplierIds = new Set(linkedSuppliers.map((s) => s.supplier_id));
          const availableSuppliers = suppliers.filter((s) => !linkedSupplierIds.has(s.id));

          return (
            <div key={item.id} className="space-y-2 rounded-md border p-3">
              <form
                action={updateScheduleItem.bind(null, projectId, stageId, item.id)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-6"
              >
                <div className="space-y-1">
                  <Label htmlFor={`date-${item.id}`} className="text-xs">Datum</Label>
                  <Input
                    id={`date-${item.id}`}
                    name="activity_date"
                    type="date"
                    defaultValue={item.activity_date}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`time-${item.id}`} className="text-xs">Tijd</Label>
                  <Input
                    id={`time-${item.id}`}
                    name="activity_time"
                    type="time"
                    defaultValue={item.activity_time?.slice(0, 5)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`activity-${item.id}`} className="text-xs">Activiteit</Label>
                  <Input
                    id={`activity-${item.id}`}
                    name="activity"
                    defaultValue={item.activity}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`priority-${item.id}`} className="text-xs">Prioriteit</Label>
                  <Input
                    id={`priority-${item.id}`}
                    name="priority"
                    defaultValue={item.priority}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`notes-${item.id}`} className="text-xs">Notities</Label>
                  <Input
                    id={`notes-${item.id}`}
                    name="notes"
                    defaultValue={item.notes}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-end gap-2 sm:col-span-6">
                  <Button type="submit" size="sm" className="h-8 text-xs">
                    Opslaan
                  </Button>
                  <Button
                    type="submit"
                    formAction={deleteScheduleItem.bind(null, projectId, stageId, item.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                  >
                    Verwijderen
                  </Button>
                </div>
              </form>

              <div className="space-y-1.5 border-t pt-2">
                <Label className="text-xs">Uitvoerders</Label>
                {linkedSuppliers.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {linkedSuppliers.map((link) => (
                      <li
                        key={link.id}
                        className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                      >
                        {link.supplier?.name ?? "Onbekend"}
                        <form action={deleteScheduleItemSupplier.bind(null, projectId, stageId, link.id)}>
                          <button
                            type="submit"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`${link.supplier?.name ?? "leverancier"} verwijderen`}
                          >
                            &times;
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                {availableSuppliers.length > 0 && (
                  <form
                    action={addScheduleItemSupplier.bind(null, projectId, stageId, item.id)}
                    className="flex items-end gap-2"
                  >
                    <SupplierSelect id={`add-supplier-${item.id}`} suppliers={availableSuppliers} />
                    <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                      Toevoegen
                    </Button>
                  </form>
                )}
              </div>
            </div>
          );
        })}

        <form
          action={addScheduleItem.bind(null, projectId, stageId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-date" className="text-xs">Datum</Label>
            <Input id="new-date" name="activity_date" type="date" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-time" className="text-xs">Tijd</Label>
            <Input id="new-time" name="activity_time" type="time" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="new-activity" className="text-xs">Activiteit</Label>
            <Input id="new-activity" name="activity" placeholder="bv. Start load in licht" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-priority" className="text-xs">Prioriteit</Label>
            <Input id="new-priority" name="priority" className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-5">
            <Label htmlFor="new-notes" className="text-xs">Notities</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Activiteit toevoegen
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground">
          Uitvoerders (leveranciers) voeg je toe nadat de activiteit is aangemaakt.
        </p>
      </CardContent>
    </Card>
  );
}
