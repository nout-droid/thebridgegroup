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

export function GuestListCard({
  projectId,
  guests,
  baseUrl,
}: {
  projectId: string;
  guests: EventGuest[];
  baseUrl: string;
}) {
  const checkedInCount = guests.filter((g) => g.checked_in_at).length;
  const totalHeadcount = guests.reduce((sum, g) => sum + 1 + g.plus_ones, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gastenlijst & inchecken</CardTitle>
        <p className="text-sm text-muted-foreground">
          {guests.length ? `${checkedInCount}/${guests.length} ingecheckt · ${totalHeadcount} personen incl. +1's` : "Nog geen gasten toegevoegd."}
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
                        Ingecheckt{" "}
                        {new Date(guest.checked_in_at).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Nog niet ingecheckt</Badge>
                    )}
                    <form action={deleteGuest.bind(null, projectId, guest.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Verwijderen
                      </Button>
                    </form>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={updateGuestType.bind(null, projectId, guest.id)} className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select
                      defaultValue={guest.guest_type}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      name="guest_type"
                    >
                      {GUEST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {GUEST_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                      Opslaan
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
                          {GUEST_RSVP_STATUS_LABELS[status]}
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
                    Badge-link
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={createGuest.bind(null, projectId)} className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-5">
          <Input name="name" placeholder="Naam" required className="sm:col-span-2" />
          <Input name="email" type="email" placeholder="E-mail" />
          <Input name="phone" placeholder="Telefoon" />
          <Input name="plus_ones" type="number" min={0} defaultValue={0} placeholder="+1's" />
          <select name="guest_type" defaultValue="gast" className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-2">
            {GUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {GUEST_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <Button type="submit" className="sm:col-span-3">
            Gast toevoegen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
