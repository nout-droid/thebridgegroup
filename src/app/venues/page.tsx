import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Venue, VenueDocument } from "@/lib/types";
import { createVenue, deleteVenue, deleteVenueDocument, updateVenue, uploadVenueDocument } from "./actions";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const VENUES_PAGE_LABELS = [
  "Locaties",
  "Een herbruikbare bibliotheek van locaties met hun technische specificaties — zodat je stroom, laad-in, afmetingen en rigging niet steeds opnieuw hoeft uit te vragen als je een eerder gebruikte locatie weer boekt.",
  "Nieuwe locatie",
  "Naam",
  "Adres",
  "Capaciteit",
  "Stroomvoorziening",
  "bv. 3x 63A CEE per podium, generator als back-up beschikbaar",
  "Laad-in toegang",
  "bv. dockhoogte, liftmaat, max. voertuiggrootte, laad-in tijden",
  "Afmetingen",
  "Zaal-/podiummaten, plafondhoogte",
  "Rigging",
  "Wifi",
  "Contactpersoon",
  "E-mail",
  "Telefoon",
  "Notities",
  "Locatie toevoegen",
  "Alle locaties",
  "Nog geen locaties toegevoegd.",
  "personen",
  "Opslaan",
  "Locatie verwijderen",
  "Documenten & tekeningen",
  "Titel",
  "Bv. Plattegrond zaal",
  "Bestand",
  "Toevoegen",
  "Nog geen documenten toegevoegd.",
  "Verwijderen",
];

export default async function VenuesPage() {
  const supabase = await createClient();

  // headers()-achtige onafhankelijke gegevens: de locaties-query en de taalvoorkeur hebben
  // geen onderlinge afhankelijkheid — parallel opvragen i.p.v. na elkaar.
  const [{ data: venues }, lang] = await Promise.all([
    supabase.from("venues").select("*").order("name", { ascending: true }).limit(500).returns<Venue[]>(),
    getAppLang(),
  ]);

  const venueIds = (venues ?? []).map((v) => v.id);
  const { data: documents } = venueIds.length
    ? await supabase
        .from("venue_documents")
        .select("*")
        .in("venue_id", venueIds)
        .order("created_at", { ascending: false })
        .returns<VenueDocument[]>()
    : { data: [] as VenueDocument[] };

  const documentsWithUrl = await Promise.all(
    (documents ?? []).map(async (doc) => ({ ...doc, url: await getSignedPortalUrl(doc.storage_path) }))
  );
  const documentsByVenue = new Map<string, (VenueDocument & { url: string | null })[]>();
  for (const doc of documentsWithUrl) {
    const list = documentsByVenue.get(doc.venue_id) ?? [];
    list.push(doc);
    documentsByVenue.set(doc.venue_id, list);
  }

  const t = await createTranslator(lang, VENUES_PAGE_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
            {t("Locaties")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Een herbruikbare bibliotheek van locaties met hun technische specificaties — zodat je stroom, laad-in, afmetingen en rigging niet steeds opnieuw hoeft uit te vragen als je een eerder gebruikte locatie weer boekt."
            )}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuwe locatie")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createVenue} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("Naam")}</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("Adres")}</Label>
                  <Input id="address" name="address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">{t("Capaciteit")}</Label>
                  <Input id="capacity" name="capacity" type="number" min={0} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="power_availability">{t("Stroomvoorziening")}</Label>
                  <Textarea
                    id="power_availability"
                    name="power_availability"
                    placeholder={t("bv. 3x 63A CEE per podium, generator als back-up beschikbaar")}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="load_in_access">{t("Laad-in toegang")}</Label>
                  <Textarea
                    id="load_in_access"
                    name="load_in_access"
                    placeholder={t("bv. dockhoogte, liftmaat, max. voertuiggrootte, laad-in tijden")}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions">{t("Afmetingen")}</Label>
                  <Textarea
                    id="dimensions"
                    name="dimensions"
                    placeholder={t("Zaal-/podiummaten, plafondhoogte")}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rigging_notes">{t("Rigging")}</Label>
                  <Textarea id="rigging_notes" name="rigging_notes" rows={2} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="wifi_notes">{t("Wifi")}</Label>
                  <Textarea id="wifi_notes" name="wifi_notes" rows={2} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">{t("Contactpersoon")}</Label>
                  <Input id="contact_name" name="contact_name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">{t("E-mail")}</Label>
                  <Input id="contact_email" name="contact_email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">{t("Telefoon")}</Label>
                  <Input id="contact_phone" name="contact_phone" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t("Notities")}</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>

              <Button type="submit">{t("Locatie toevoegen")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Alle locaties")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!venues?.length ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen locaties toegevoegd.")}</p>
            ) : (
              venues.map((venue) => (
                <details key={venue.id} className="rounded-md border p-3">
                  <summary className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="font-medium">
                      {venue.name}
                      {venue.address ? (
                        <span className="font-normal text-muted-foreground"> ({venue.address})</span>
                      ) : null}
                    </span>
                    {venue.capacity ? (
                      <span className="text-xs text-muted-foreground">
                        {venue.capacity} {t("personen")}
                      </span>
                    ) : null}
                  </summary>

                  <div className="mt-3 space-y-4 border-t pt-3">
                    <form action={updateVenue.bind(null, venue.id)} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${venue.id}`}>{t("Naam")}</Label>
                          <Input id={`name-${venue.id}`} name="name" defaultValue={venue.name} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`address-${venue.id}`}>{t("Adres")}</Label>
                          <Input id={`address-${venue.id}`} name="address" defaultValue={venue.address ?? ""} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`capacity-${venue.id}`}>{t("Capaciteit")}</Label>
                          <Input
                            id={`capacity-${venue.id}`}
                            name="capacity"
                            type="number"
                            min={0}
                            defaultValue={venue.capacity ?? ""}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`power-${venue.id}`}>{t("Stroomvoorziening")}</Label>
                          <Textarea
                            id={`power-${venue.id}`}
                            name="power_availability"
                            defaultValue={venue.power_availability ?? ""}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`loadin-${venue.id}`}>{t("Laad-in toegang")}</Label>
                          <Textarea
                            id={`loadin-${venue.id}`}
                            name="load_in_access"
                            defaultValue={venue.load_in_access ?? ""}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`dimensions-${venue.id}`}>{t("Afmetingen")}</Label>
                          <Textarea
                            id={`dimensions-${venue.id}`}
                            name="dimensions"
                            defaultValue={venue.dimensions ?? ""}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`rigging-${venue.id}`}>{t("Rigging")}</Label>
                          <Textarea
                            id={`rigging-${venue.id}`}
                            name="rigging_notes"
                            defaultValue={venue.rigging_notes ?? ""}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`wifi-${venue.id}`}>{t("Wifi")}</Label>
                          <Textarea
                            id={`wifi-${venue.id}`}
                            name="wifi_notes"
                            defaultValue={venue.wifi_notes ?? ""}
                            rows={2}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`contact-name-${venue.id}`}>{t("Contactpersoon")}</Label>
                          <Input
                            id={`contact-name-${venue.id}`}
                            name="contact_name"
                            defaultValue={venue.contact_name ?? ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contact-email-${venue.id}`}>{t("E-mail")}</Label>
                          <Input
                            id={`contact-email-${venue.id}`}
                            name="contact_email"
                            type="email"
                            defaultValue={venue.contact_email ?? ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contact-phone-${venue.id}`}>{t("Telefoon")}</Label>
                          <Input
                            id={`contact-phone-${venue.id}`}
                            name="contact_phone"
                            defaultValue={venue.contact_phone ?? ""}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${venue.id}`}>{t("Notities")}</Label>
                        <Textarea
                          id={`notes-${venue.id}`}
                          name="notes"
                          defaultValue={venue.notes ?? ""}
                          rows={2}
                        />
                      </div>

                      <Button type="submit" size="sm">
                        {t("Opslaan")}
                      </Button>
                    </form>

                    <div className="space-y-3 border-t pt-3">
                      <Label className="text-sm font-medium">{t("Documenten & tekeningen")}</Label>

                      {!documentsByVenue.get(venue.id)?.length ? (
                        <p className="text-sm text-muted-foreground">{t("Nog geen documenten toegevoegd.")}</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {documentsByVenue.get(venue.id)!.map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                              {doc.url ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate text-primary underline"
                                >
                                  {doc.title}
                                </a>
                              ) : (
                                <span className="truncate">{doc.title}</span>
                              )}
                              <form action={deleteVenueDocument.bind(null, doc.id)}>
                                <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                                  {t("Verwijderen")}
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}

                      <form
                        action={uploadVenueDocument.bind(null, venue.id)}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor={`doc-title-${venue.id}`} className="text-xs">{t("Titel")}</Label>
                          <Input
                            id={`doc-title-${venue.id}`}
                            name="title"
                            placeholder={t("Bv. Plattegrond zaal")}
                            className="h-8 w-48 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`doc-file-${venue.id}`} className="text-xs">{t("Bestand")}</Label>
                          <Input id={`doc-file-${venue.id}`} name="file" type="file" className="h-8 text-xs" />
                        </div>
                        <Button type="submit" size="sm" className="h-8 text-xs">
                          {t("Toevoegen")}
                        </Button>
                      </form>
                    </div>

                    <form action={deleteVenue.bind(null, venue.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                        {t("Locatie verwijderen")}
                      </Button>
                    </form>
                  </div>
                </details>
              ))
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
