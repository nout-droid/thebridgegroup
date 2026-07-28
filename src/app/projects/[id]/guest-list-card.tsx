import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GUEST_RSVP_STATUSES,
  GUEST_RSVP_STATUS_LABELS,
  GUEST_TYPES,
  GUEST_TYPE_LABELS,
  type EventGuest,
  type GuestRsvpStatus,
  type GuestType,
} from "@/lib/types";
import { createGuest, deleteGuest, updateGuestRsvp, updateGuestType } from "./guest-list-actions";
import type { Translator } from "@/lib/server/translate";

export const GUEST_LIST_CARD_LABELS = [
  "Gastenlijst & inchecken",
  "ingecheckt",
  "personen incl. +1's",
  "Nog geen gasten toegevoegd.",
  "Ingecheckt",
  "Nog niet ingecheckt",
  "Verwijderen",
  "Type",
  "Opslaan",
  "Badge-link",
  "Naam",
  "E-mail",
  "Telefoon",
  "+1's",
  "Gast toevoegen",
  ...Object.values(GUEST_TYPE_LABELS),
  ...Object.values(GUEST_RSVP_STATUS_LABELS),
];

const identity: Translator = (text) => text;

export function GuestListCard({
  projectId,
  guests,
  baseUrl,
  t = identity,
}: {
  projectId: string;
  guests: EventGuest[];
  baseUrl: string;
  t?: Translator;
}) {
  const checkedInCount = guests.filter((g) => g.checked_in_at).length;
  const totalHeadcount = guests.reduce((sum, g) => sum + 1 + g.plus_ones, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Gastenlijst & inchecken")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {guests.length
            ? `${checkedInCount}/${guests.length} ${t("ingecheckt")} · ${totalHeadcount} ${t("personen incl. +1's")}`
            : t("Nog geen gasten toegevoegd.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {guests.length > 0 && (
          <ul className="space-y-2">
            {guests.map((guest) => (
              <li key={guest.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {guest.name}
                      {guest.plus_ones > 0 && ` (+${guest.plus_ones})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {guest.email}
                      {guest.phone && ` · ${guest.phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {guest.checked_in_at ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {t("Ingecheckt")}{" "}
                        {new Date(guest.checked_in_at).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("Nog niet ingecheckt")}</Badge>
                    )}
                    <form action={deleteGuest.bind(null, projectId, guest.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        {t("Verwijderen")}
                      </Button>
                    </form>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={updateGuestType.bind(null, projectId, guest.id)} className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground">{t("Type")}</label>
                    <select
                      defaultValue={guest.guest_type}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      name="guest_type"
                    >
                      {GUEST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(GUEST_TYPE_LABELS[type])}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                      {t("Opslaan")}
                    </Button>
                  </form>
                  <div className="flex gap-1">
                    {GUEST_RSVP_STATUSES.map((status) => (
                      <form key={status} action={updateGuestRsvp.bind(null, projectId, guest.id, status)}>
                        <Button
                          type="submit"
                          size="sm"
                          variant={guest.rsvp_status === status ? "default" : "outline"}
                          className="h-7 text-xs"
                        >
                          {t(GUEST_RSVP_STATUS_LABELS[status])}
                        </Button>
                      </form>
                    ))}
                  </div>
                  <a
                    href={`${baseUrl}/guest-badge/${guest.badge_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-primary underline"
                  >
                    {t("Badge-link")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={createGuest.bind(null, projectId)} className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-5">
          <Input name="name" placeholder={t("Naam")} required className="sm:col-span-2" />
          <Input name="email" type="email" placeholder={t("E-mail")} />
          <Input name="phone" placeholder={t("Telefoon")} />
          <Input name="plus_ones" type="number" min={0} defaultValue={0} placeholder={t("+1's")} />
          <select name="guest_type" defaultValue="gast" className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-2">
            {GUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(GUEST_TYPE_LABELS[type])}
              </option>
            ))}
          </select>
          <Button type="submit" className="sm:col-span-3">
            {t("Gast toevoegen")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
