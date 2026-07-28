"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CommsAssignment, CommsKind } from "@/lib/types";
import { addSupplierComms, deleteSupplierComms, updateSupplierComms } from "../requests-actions";
import { useSupplierTranslator } from "../translator-context";
import type { Translator } from "@/hooks/use-translator";

function CommsList({
  supplierId,
  projectId,
  kind,
  title,
  items,
  t,
}: {
  supplierId: string;
  projectId: string;
  kind: CommsKind;
  title: string;
  items: CommsAssignment[];
  t: Translator;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium">{t(title)}</p>

      {items.map((item) => (
        <form
          key={item.id}
          action={updateSupplierComms.bind(null, supplierId, projectId, item.id)}
          className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor={`user-${item.id}`} className="text-xs">{t("Gebruiker")}</Label>
            <Input
              id={`user-${item.id}`}
              name="user_name"
              defaultValue={item.user_name}
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`device-${item.id}`} className="text-xs">{t("Type")}</Label>
            <Input
              id={`device-${item.id}`}
              name="device_type"
              defaultValue={item.device_type}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`channels-${item.id}`} className="text-xs">{t("Kanalen")}</Label>
            <Input
              id={`channels-${item.id}`}
              name="channels"
              defaultValue={item.channels}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {t("Opslaan")}
            </Button>
            <Button
              type="submit"
              formAction={deleteSupplierComms.bind(null, supplierId, projectId, item.id)}
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
            >
              {t("Verwijderen")}
            </Button>
          </div>
        </form>
      ))}

      <form
        action={addSupplierComms.bind(null, supplierId, projectId, kind)}
        className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4"
      >
        <div className="space-y-1">
          <Label htmlFor={`new-user-${kind}`} className="text-xs">{t("Gebruiker")}</Label>
          <Input id={`new-user-${kind}`} name="user_name" className="h-8 text-xs" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-device-${kind}`} className="text-xs">{t("Type")}</Label>
          <Input id={`new-device-${kind}`} name="device_type" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-channels-${kind}`} className="text-xs">{t("Kanalen")}</Label>
          <Input id={`new-channels-${kind}`} name="channels" className="h-8 text-xs" />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" className="h-8 text-xs">
            {t("Toevoegen")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function SupplierCommsSection({
  supplierId,
  projectId,
  assignments,
}: {
  supplierId: string;
  projectId: string;
  assignments: CommsAssignment[];
}) {
  const { t } = useSupplierTranslator();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Comms & Portofoons")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("Intercom- en portofoon-behoefte voor jouw crew.")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommsList
          supplierId={supplierId}
          projectId={projectId}
          kind="intercom"
          title="Intercom"
          items={assignments.filter((a) => a.kind === "intercom")}
          t={t}
        />
        <CommsList
          supplierId={supplierId}
          projectId={projectId}
          kind="portofoon"
          title="Portofoon"
          items={assignments.filter((a) => a.kind === "portofoon")}
          t={t}
        />
      </CardContent>
    </Card>
  );
}
