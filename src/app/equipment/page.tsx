import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccessDatesInput } from "@/components/access-dates-input";
import { getTeamOwnerId } from "@/lib/server/team";
import type { EquipmentBooking, EquipmentItem } from "@/lib/types";
import {
  bookEquipmentItem,
  createEquipmentItem,
  deleteEquipmentBooking,
  deleteEquipmentItem,
  updateEquipmentItem,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const EQUIPMENT_PAGE_LABELS = [
  "Materiaalbeheer",
  "Eigen materiaal dat wij zelf meenemen — los van producties. Beheer hier de inventaris en boek items op een project; kosten en een pakbon landen automatisch bij dat project.",
  "Nieuw materiaalitem",
  "Naam",
  "Categorie",
  "Bv. Licht, Audio, Rigging, Kabels",
  "Assetnummer",
  "Aantal in bezit",
  "Interne dagprijs (€)",
  "Vervangingswaarde (€)",
  "Notities",
  "Item toevoegen",
  "Nog geen materiaal in de inventaris.",
  "Opslaan",
  "Verwijderen",
  "Boek op project",
  "Project",
  "Kies project",
  "Aantal",
  "Toegangsdagen",
  "Boeken",
  "Boekingen",
  "Nog geen boekingen.",
  "Pakbon",
  "van de",
  "in bezit",
  "staffel",
  "De dagprijs is het basistarief voor de eerste periode (1-4 dagen); langere boekingen schalen automatisch op via dezelfde huurperiode-staffel als de externe verhuurcatalogus.",
];

interface BookingRow extends EquipmentBooking {
  project: { id: string; name: string } | { id: string; name: string }[] | null;
}

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const [{ data: items }, { data: projects }, lang] = await Promise.all([
    supabase
      .from("equipment_items")
      .select("*")
      .eq("user_id", ownerId)
      .order("name", { ascending: true })
      .returns<EquipmentItem[]>(),
    supabase.from("projects").select("id, name").eq("user_id", ownerId).order("name", { ascending: true }).returns<
      { id: string; name: string }[]
    >(),
    getAppLang(),
  ]);

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: bookings } = itemIds.length
    ? await supabase
        .from("equipment_bookings")
        .select("*, project:projects(id, name)")
        .in("equipment_item_id", itemIds)
        .order("created_at", { ascending: false })
        .returns<BookingRow[]>()
    : { data: [] as BookingRow[] };

  const bookingsByItem = new Map<string, BookingRow[]>();
  for (const booking of bookings ?? []) {
    const list = bookingsByItem.get(booking.equipment_item_id) ?? [];
    list.push(booking);
    bookingsByItem.set(booking.equipment_item_id, list);
  }

  // Materiaal wordt via dezelfde huurperiode-staffel geprijsd als de externe catalogus
  // (rental_multiplier) — de dagprijs is het basistarief, langere boekingen schalen op.
  const uniqueDayCounts = Array.from(
    new Set((bookings ?? []).map((b) => (b.access_dates ?? []).length).filter((d) => d > 0))
  );
  const multiplierByDays = new Map<number, number>();
  await Promise.all(
    uniqueDayCounts.map(async (days) => {
      const { data: multiplier } = await supabase.rpc("rental_multiplier", { p_days: days });
      multiplierByDays.set(days, multiplier ?? 1);
    })
  );
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  const t = await createTranslator(lang, [
    ...EQUIPMENT_PAGE_LABELS,
    ...(items ?? []).map((i) => i.name),
    ...(projects ?? []).map((p) => p.name),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          {t("Materiaalbeheer")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Eigen materiaal dat wij zelf meenemen — los van producties. Beheer hier de inventaris en boek items op een project; kosten en een pakbon landen automatisch bij dat project."
          )}
        </p>

        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuw materiaalitem")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createEquipmentItem} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">{t("Naam")}</Label>
                  <Input id="new-name" name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-category">{t("Categorie")}</Label>
                  <Input id="new-category" name="category" placeholder={t("Bv. Licht, Audio, Rigging, Kabels")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-asset">{t("Assetnummer")}</Label>
                  <Input id="new-asset" name="asset_number" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-qty">{t("Aantal in bezit")}</Label>
                  <Input id="new-qty" name="quantity_owned" type="number" min="1" defaultValue={1} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-rate">{t("Interne dagprijs (€)")}</Label>
                  <Input id="new-rate" name="internal_day_rate" type="number" step="0.01" min="0" />
                  <p className="text-[10px] text-muted-foreground">
                    {t(
                      "De dagprijs is het basistarief voor de eerste periode (1-4 dagen); langere boekingen schalen automatisch op via dezelfde huurperiode-staffel als de externe verhuurcatalogus."
                    )}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-value">{t("Vervangingswaarde (€)")}</Label>
                  <Input id="new-value" name="replacement_value" type="number" step="0.01" min="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-notes">{t("Notities")}</Label>
                <textarea
                  id="new-notes"
                  name="notes"
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit">{t("Item toevoegen")}</Button>
            </form>
          </CardContent>
        </Card>

        {!items?.length ? (
          <p className="text-sm text-muted-foreground">{t("Nog geen materiaal in de inventaris.")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const itemBookings = bookingsByItem.get(item.id) ?? [];
              return (
                <details key={item.id} className="rounded-md border p-3">
                  <summary className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="font-medium">
                      {t(item.name)}{" "}
                      {item.category && (
                        <span className="font-normal text-muted-foreground">({t(item.category)})</span>
                      )}
                    </span>
                    <Badge variant="secondary">
                      {item.quantity_owned} {t("in bezit")}
                    </Badge>
                  </summary>

                  <div className="mt-3 space-y-4 border-t pt-3">
                    <form action={updateEquipmentItem.bind(null, item.id)} className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Naam")}</Label>
                          <Input name="name" defaultValue={item.name} className="h-8 text-xs" required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Categorie")}</Label>
                          <Input name="category" defaultValue={item.category} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Assetnummer")}</Label>
                          <Input name="asset_number" defaultValue={item.asset_number} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Aantal in bezit")}</Label>
                          <Input
                            name="quantity_owned"
                            type="number"
                            min="1"
                            defaultValue={item.quantity_owned}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Interne dagprijs (€)")}</Label>
                          <Input
                            name="internal_day_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={item.internal_day_rate}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Vervangingswaarde (€)")}</Label>
                          <Input
                            name="replacement_value"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={item.replacement_value}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("Notities")}</Label>
                        <textarea
                          name="notes"
                          defaultValue={item.notes}
                          rows={2}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                        />
                      </div>
                      <Button type="submit" size="sm" className="h-7 text-xs">
                        {t("Opslaan")}
                      </Button>
                    </form>

                    <form action={deleteEquipmentItem.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                        {t("Verwijderen")}
                      </Button>
                    </form>

                    <div className="space-y-2 rounded-md border p-2.5">
                      <p className="text-xs font-medium">{t("Boekingen")}</p>
                      {itemBookings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("Nog geen boekingen.")}</p>
                      ) : (
                        <ul className="space-y-1">
                          {itemBookings.map((booking) => {
                            const project = Array.isArray(booking.project) ? booking.project[0] : booking.project;
                            const days = (booking.access_dates ?? []).length;
                            const multiplier = multiplierByDays.get(days) ?? 1;
                            const dayRate = itemById.get(booking.equipment_item_id)?.internal_day_rate ?? 0;
                            const cost = dayRate * booking.quantity * multiplier;
                            return (
                              <li
                                key={booking.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                              >
                                <span>
                                  <span className="font-medium">{project ? t(project.name) : "—"}</span>
                                  {" · "}
                                  {booking.quantity}x · {days} {t("Toegangsdagen").toLowerCase()} · ×
                                  {multiplier.toFixed(2)} {t("staffel")} · {euro(cost)}
                                </span>
                                <span className="flex items-center gap-2">
                                  {project && (
                                    <a
                                      href={`/equipment/pakbon/${project.id}`}
                                      className="text-primary underline"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {t("Pakbon")}
                                    </a>
                                  )}
                                  <form action={deleteEquipmentBooking.bind(null, booking.id)}>
                                    <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                                      {t("Verwijderen")}
                                    </Button>
                                  </form>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <form
                      action={bookEquipmentItem.bind(null, item.id)}
                      className="space-y-2 rounded-md border p-2.5"
                    >
                      <p className="text-xs font-medium">{t("Boek op project")}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Project")}</Label>
                          <select
                            name="project_id"
                            required
                            defaultValue=""
                            className="h-8 w-full rounded-md border bg-background px-1.5 text-xs"
                          >
                            <option value="" disabled>
                              {t("Kies project")}
                            </option>
                            {(projects ?? []).map((project) => (
                              <option key={project.id} value={project.id}>
                                {t(project.name)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">{t("Aantal")}</Label>
                          <Input
                            name="quantity"
                            type="number"
                            min="1"
                            defaultValue={1}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">{t("Toegangsdagen")}</Label>
                        <AccessDatesInput />
                      </div>
                      <Button type="submit" size="sm" className="h-7 text-xs">
                        {t("Boeken")}
                      </Button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
