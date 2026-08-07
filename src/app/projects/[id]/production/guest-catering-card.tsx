import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GUEST_CATERING_MOMENTS,
  GUEST_CATERING_MOMENT_LABELS,
  GUEST_CATERING_STYLES,
  GUEST_CATERING_STYLE_LABELS,
  DEFAULT_GUEST_CATERING_STYLE_BY_EVENT_TYPE,
  type EventType,
  type GuestCateringOrder,
  type SharedGuestDietary,
  type Stage,
  type Supplier,
} from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import {
  addGuestCateringOrder,
  deleteGuestCateringOrder,
  updateGuestCateringOrder,
} from "./guest-catering-actions";
import type { Translator } from "@/lib/server/translate";

export const GUEST_CATERING_CARD_LABELS = [
  "Catering gasten",
  "Uitgebreider dan crew catering: per moment en stijl, met dieetcategorieën. De juiste stijl hangt af van het type event.",
  "Catering gasten downloaden (PDF)",
  "Datum",
  "Area",
  "Moment",
  "Stijl",
  "Leverancier",
  "Kies leverancier",
  "Kies podium",
  "Projectbreed",
  "Gasten",
  "Veggie",
  "Vegan",
  "Kids",
  "Speciaal dieet",
  "Opmerkingen",
  "Opslaan",
  "Verwijderen",
  "Order toevoegen",
  "Dieetwensen vanuit RSVP",
  "Deze wensen zijn door gasten zelf ingevuld bij het aanmelden — reken ze mee bij de aantallen hierboven.",
  "Geen dieetwensen doorgegeven.",
  "+1:",
  ...Object.values(GUEST_CATERING_MOMENT_LABELS),
  ...Object.values(GUEST_CATERING_STYLE_LABELS),
];

const identity: Translator = (text) => text;

function sortOrders(orders: GuestCateringOrder[]): GuestCateringOrder[] {
  return [...orders].sort((a, b) => {
    if (a.order_date !== b.order_date) return a.order_date < b.order_date ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

function MomentSelect({ id, name, defaultValue, t }: { id: string; name: string; defaultValue?: string; t: Translator }) {
  return (
    <Select name={name} defaultValue={defaultValue ?? "diner"}>
      <SelectTrigger id={id} className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GUEST_CATERING_MOMENTS.map((m) => (
          <SelectItem key={m} value={m}>
            {t(GUEST_CATERING_MOMENT_LABELS[m])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StyleSelect({ id, name, defaultValue, t }: { id: string; name: string; defaultValue?: string; t: Translator }) {
  return (
    <Select name={name} defaultValue={defaultValue ?? "buffet"}>
      <SelectTrigger id={id} className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GUEST_CATERING_STYLES.map((s) => (
          <SelectItem key={s} value={s}>
            {t(GUEST_CATERING_STYLE_LABELS[s])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function GuestCateringCard({
  projectId,
  eventType,
  orders,
  dietary,
  suppliers,
  stages,
  t = identity,
}: {
  projectId: string;
  eventType: EventType;
  orders: GuestCateringOrder[];
  dietary: SharedGuestDietary[];
  suppliers: Supplier[];
  stages: Stage[];
  t?: Translator;
}) {
  const sorted = sortOrders(orders);
  const defaultStyle = DEFAULT_GUEST_CATERING_STYLE_BY_EVENT_TYPE[eventType] ?? "buffet";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Catering gasten")}</CardTitle>
          {orders.length > 0 && (
            <a
              href={`/projects/${projectId}/production/guest-catering/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {t("Catering gasten downloaden (PDF)")}
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            "Uitgebreider dan crew catering: per moment en stijl, met dieetcategorieën. De juiste stijl hangt af van het type event."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {dietary.length > 0 && (
          <div className="space-y-1 rounded-md border p-3">
            <p className="text-xs font-medium">{t("Dieetwensen vanuit RSVP")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Deze wensen zijn door gasten zelf ingevuld bij het aanmelden — reken ze mee bij de aantallen hierboven.")}
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {dietary.map((g, index) => (
                <li key={index}>
                  <span className="font-medium">{g.name}</span>
                  {g.plus_one_name && <span> ({t("+1:")} {g.plus_one_name})</span>}
                  {": "}
                  {g.dietary_notes}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sorted.map((order) => (
          <form
            key={order.id}
            action={updateGuestCateringOrder.bind(null, projectId, order.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-9"
          >
            <div className="space-y-1">
              <Label htmlFor={`date-${order.id}`} className="text-xs">{t("Datum")}</Label>
              <Input
                id={`date-${order.id}`}
                name="order_date"
                type="date"
                defaultValue={order.order_date}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`stage-${order.id}`} className="text-xs">{t("Area")}</Label>
              <StageSelect
                id={`stage-${order.id}`}
                defaultValue={order.stage_id ?? undefined}
                stages={stages}
                placeholder={t("Kies podium")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`moment-${order.id}`} className="text-xs">{t("Moment")}</Label>
              <MomentSelect id={`moment-${order.id}`} name="moment" defaultValue={order.moment} t={t} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`style-${order.id}`} className="text-xs">{t("Stijl")}</Label>
              <StyleSelect id={`style-${order.id}`} name="style" defaultValue={order.style} t={t} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`supplier-${order.id}`} className="text-xs">{t("Leverancier")}</Label>
              <SupplierSelect
                id={`supplier-${order.id}`}
                defaultValue={order.supplier_id ?? undefined}
                suppliers={suppliers}
                placeholder={t("Kies leverancier")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`gc-${order.id}`} className="text-xs">{t("Gasten")}</Label>
              <Input id={`gc-${order.id}`} name="guest_count" type="number" min={0} defaultValue={order.guest_count} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`vc-${order.id}`} className="text-xs">{t("Veggie")}</Label>
              <Input id={`vc-${order.id}`} name="veggie_count" type="number" min={0} defaultValue={order.veggie_count} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`vgc-${order.id}`} className="text-xs">{t("Vegan")}</Label>
              <Input id={`vgc-${order.id}`} name="vegan_count" type="number" min={0} defaultValue={order.vegan_count} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`kc-${order.id}`} className="text-xs">{t("Kids")}</Label>
              <Input id={`kc-${order.id}`} name="kids_count" type="number" min={0} defaultValue={order.kids_count} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`sdc-${order.id}`} className="text-xs">{t("Speciaal dieet")}</Label>
              <Input id={`sdc-${order.id}`} name="special_diet_count" type="number" min={0} defaultValue={order.special_diet_count} className="h-8 text-xs" />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor={`notes-${order.id}`} className="text-xs">{t("Opmerkingen")}</Label>
              <Input id={`notes-${order.id}`} name="notes" defaultValue={order.notes} className="h-8 text-xs" />
            </div>
            <div className="flex items-end gap-2 sm:col-span-9">
              <Button type="submit" size="sm" className="h-8 text-xs">
                {t("Opslaan")}
              </Button>
              <Button
                type="submit"
                formAction={deleteGuestCateringOrder.bind(null, projectId, order.id)}
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
          action={addGuestCateringOrder.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-9"
        >
          <div className="space-y-1">
            <Label htmlFor="new-date" className="text-xs">{t("Datum")}</Label>
            <Input id="new-date" name="order_date" type="date" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-stage" className="text-xs">{t("Area")}</Label>
            <StageSelect id="new-stage" stages={stages} placeholder={t("Kies podium")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-moment" className="text-xs">{t("Moment")}</Label>
            <MomentSelect id="new-moment" name="moment" t={t} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-style" className="text-xs">{t("Stijl")}</Label>
            <StyleSelect id="new-style" name="style" defaultValue={defaultStyle} t={t} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">{t("Leverancier")}</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} placeholder={t("Kies leverancier")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-gc" className="text-xs">{t("Gasten")}</Label>
            <Input id="new-gc" name="guest_count" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-vc" className="text-xs">{t("Veggie")}</Label>
            <Input id="new-vc" name="veggie_count" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-vgc" className="text-xs">{t("Vegan")}</Label>
            <Input id="new-vgc" name="vegan_count" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-kc" className="text-xs">{t("Kids")}</Label>
            <Input id="new-kc" name="kids_count" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-sdc" className="text-xs">{t("Speciaal dieet")}</Label>
            <Input id="new-sdc" name="special_diet_count" type="number" min={0} defaultValue={0} className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="new-notes" className="text-xs">{t("Opmerkingen")}</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
          <div className="sm:col-span-9">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {t("Order toevoegen")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
