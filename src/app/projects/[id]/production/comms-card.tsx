import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CommsAssignment, CommsKind, CrewMember, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { CrewMemberSelect } from "../crew-member-select";
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
  suppliers,
  crewMembers,
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
  suppliers: Supplier[];
  crewMembers: CrewMember[];
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
          <div className="space-y-1">
            <Label htmlFor={`supplier-${item.id}`} className="text-xs">Leverancier</Label>
            <SupplierSelect
              id={`supplier-${item.id}`}
              defaultValue={item.supplier_id ?? undefined}
              suppliers={suppliers}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`crew-${item.id}`} className="text-xs">Crewlid (optioneel)</Label>
            <CrewMemberSelect
              id={`crew-${item.id}`}
              defaultValue={item.crew_member_id ?? undefined}
              members={crewMembers}
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
        <div className="space-y-1">
          <Label htmlFor={`new-supplier-${kind}`} className="text-xs">Leverancier</Label>
          <SupplierSelect id={`new-supplier-${kind}`} suppliers={suppliers} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-crew-${kind}`} className="text-xs">Crewlid (optioneel)</Label>
          <CrewMemberSelect id={`new-crew-${kind}`} members={crewMembers} />
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
  suppliers,
  crewMembers,
}: {
  projectId: string;
  intercomAssignments: CommsAssignment[];
  portofoonAssignments: CommsAssignment[];
  suppliers: Supplier[];
  crewMembers: CrewMember[];
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
        {(intercomAssignments.length > 0 || portofoonAssignments.length > 0) && (
          <a
            href={`/projects/${projectId}/production/comms/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            Comms & portofoons downloaden (PDF)
          </a>
        )}
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
          suppliers={suppliers}
          crewMembers={crewMembers}
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
          suppliers={suppliers}
          crewMembers={crewMembers}
        />
      </CardContent>
    </Card>
  );
}
