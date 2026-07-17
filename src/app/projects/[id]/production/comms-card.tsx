import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CommsAssignment, CommsKind } from "@/lib/types";
import { addCommsAssignment, deleteCommsAssignment, updateCommsAssignment } from "./comms-actions";

function CommsList({
  projectId,
  kind,
  title,
  description,
  deviceLabel,
  devicePlaceholder,
  channelsLabel,
  channelsPlaceholder,
  items,
}: {
  projectId: string;
  kind: CommsKind;
  title: string;
  description: string;
  deviceLabel: string;
  devicePlaceholder: string;
  channelsLabel: string;
  channelsPlaceholder: string;
  items: CommsAssignment[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {items.map((item) => (
        <form
          key={item.id}
          action={updateCommsAssignment.bind(null, projectId, item.id)}
          className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor={`user-${item.id}`} className="text-xs">Gebruiker</Label>
            <Input
              id={`user-${item.id}`}
              name="user_name"
              defaultValue={item.user_name}
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`device-${item.id}`} className="text-xs">{deviceLabel}</Label>
            <Input
              id={`device-${item.id}`}
              name="device_type"
              defaultValue={item.device_type}
              placeholder={devicePlaceholder}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`channels-${item.id}`} className="text-xs">{channelsLabel}</Label>
            <Input
              id={`channels-${item.id}`}
              name="channels"
              defaultValue={item.channels}
              placeholder={channelsPlaceholder}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Opslaan
            </Button>
            <Button
              type="submit"
              formAction={deleteCommsAssignment.bind(null, projectId, item.id)}
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
        action={addCommsAssignment.bind(null, projectId, kind)}
        className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4"
      >
        <div className="space-y-1">
          <Label htmlFor={`new-user-${kind}`} className="text-xs">Gebruiker</Label>
          <Input id={`new-user-${kind}`} name="user_name" className="h-8 text-xs" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-device-${kind}`} className="text-xs">{deviceLabel}</Label>
          <Input
            id={`new-device-${kind}`}
            name="device_type"
            placeholder={devicePlaceholder}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-channels-${kind}`} className="text-xs">{channelsLabel}</Label>
          <Input
            id={`new-channels-${kind}`}
            name="channels"
            placeholder={channelsPlaceholder}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" className="h-8 text-xs">
            Toevoegen
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CommsCard({
  projectId,
  intercomAssignments,
  portofoonAssignments,
}: {
  projectId: string;
  intercomAssignments: CommsAssignment[];
  portofoonAssignments: CommsAssignment[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comms & Portofoons</CardTitle>
        <p className="text-sm text-muted-foreground">
          Wie zit op welk intercom-kanaal en welke portofoon-groep.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommsList
          projectId={projectId}
          kind="intercom"
          title="Intercom-toewijzing"
          description="Bijvoorbeeld Show, Audio, Video, Licht, Stage."
          deviceLabel="Type"
          devicePlaceholder="bv. Wireless"
          channelsLabel="Kanalen"
          channelsPlaceholder="bv. Show, Stage"
          items={intercomAssignments}
        />
        <CommsList
          projectId={projectId}
          kind="portofoon"
          title="Portofoon-toewijzing"
          description="Bijvoorbeeld 1: Productie, 2: Horeca, 3: Techniek, 4: Beveiliging, 5: Special FX."
          deviceLabel="Portofoon"
          devicePlaceholder="bv. kanaal 3"
          channelsLabel="Groepen"
          channelsPlaceholder="bv. 1: Productie, 4: Beveiliging"
          items={portofoonAssignments}
        />
      </CardContent>
    </Card>
  );
}
