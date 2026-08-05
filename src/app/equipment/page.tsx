import { redirect } from "next/navigation";
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
  addEquipmentMultiplierTier,
  bookEquipmentItem,
  createEquipmentItem,
  deleteEquipmentBooking,
  deleteEquipmentItem,
  deleteEquipmentMultiplierTier,
  updateEquipmentItem,
  updateEquipmentMultiplierTier,
} from "./actions";
import { computeEquipmentMultiplier, ensureEquipmentRentalMultipliers } from "@/lib/server/ensure-equipment-multipliers";
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
  "De dagprijs is het basistarief voor de eerste periode; langere boekingen schalen automatisch op via je eigen huurperiode-staffel hieronder.",
  "Huurperiode-staffel",
  "Je eigen staffel voor materiaal — los van de externe verhuurcatalogus. Vanaf hoeveel dagen geldt welke vermenigvuldiging op de dagprijs.",
  "Vanaf (dagen)",
  "Label",
  "Vermenigvuldiging",
  "Tier toevoegen",
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
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const [{ data: items }, { data: projects }, lang] = await Promise.all([
    supabase
      .from("equipment_items")
      .select("*")
      .eq("user_id", ownerId)
      .order("name", { ascending: true })
      .limit(500)
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

  // Materiaal wordt geprijsd via een eigen, per organisatie bewerkbare huurperiode-staffel
  // (los van de externe verhuurcatalogus) — de dagprijs is het basistarief, langere
  // boekingen schalen op.
  const tiers = await ensureEquipmentRentalMultipliers(supabase, ownerId);
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  const t = await createTranslator(lang, [
    ...EQUIPMENT_PAGE_LABELS,
    ...(items ?? []).map((i) => i.name),
    ...(projects ?? []).map((p) => p.name),
    ...tiers.map((tier) => tier.label),
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
                      "De dagprijs is het basistarief voor de eerste periode; langere boekingen schalen automatisch op via je eigen huurperiode-staffel hieronder."
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
                            const multiplier = computeEquipmentMultiplier(tiers, days);
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Huurperiode-staffel")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Je eigen staffel voor materiaal — los van de externe verhuurcatalogus. Vanaf hoeveel dagen geldt welke vermenigvuldiging op de dagprijs."
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5">
              {tiers.map((tier) => (
                <li key={tier.id} className="flex items-center gap-2">
                  <form
                    action={updateEquipmentMultiplierTier.bind(null, tier.id)}
                    className="flex flex-1 flex-wrap items-center gap-1.5"
                  >
                    <Input
                      name="min_days"
                      type="number"
                      min="1"
                      defaultValue={tier.min_days}
                      className="h-8 w-24 text-xs"
                      required
                    />
                    <Input
                      name="label"
                      defaultValue={tier.label}
                      className="h-8 w-32 text-xs"
                      required
                    />
                    <Input
                      name="multiplier"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={tier.multiplier}
                      className="h-8 w-24 text-xs"
                      required
                    />
                    <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                      {t("Opslaan")}
                    </Button>
                  </form>
                  <form action={deleteEquipmentMultiplierTier.bind(null, tier.id)}>
                    <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs text-destructive">
                      {t("Verwijderen")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>

            <form action={addEquipmentMultiplierTier} className="flex flex-wrap items-end gap-1.5 border-t pt-3">
              <div className="space-y-1">
                <Label className="text-[10px]">{t("Vanaf (dagen)")}</Label>
                <Input name="min_days" type="number" min="1" className="h-8 w-24 text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">{t("Label")}</Label>
                <Input name="label" className="h-8 w-32 text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">{t("Vermenigvuldiging")}</Label>
                <Input name="multiplier" type="number" step="0.01" min="0" defaultValue={1} className="h-8 w-24 text-xs" required />
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs">
                {t("Tier toevoegen")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
