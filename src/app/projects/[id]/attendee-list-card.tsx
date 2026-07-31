import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { ShareLinkBox } from "./share-link-box";
import type { EventAttendee } from "@/lib/types";
import { setAttendeeAppEnabled } from "./attendee-actions";
import type { Translator } from "@/lib/server/translate";

export const ATTENDEE_LIST_CARD_LABELS = [
  "Attendee app",
  "Bezoekers kunnen zichzelf registreren voor hun eigen agenda en (optioneel) netwerken met andere bezoekers.",
  "Attendee app aanzetten voor dit project",
  "Opslaan",
  "De attendee app staat aan. Deel deze link met bezoekers om zichzelf te registreren:",
  "Kopieer link",
  "Gekopieerd",
  "Geregistreerde bezoekers",
  "Nog geen bezoekers geregistreerd.",
  "Naam",
  "Bedrijf",
  "Netwerken",
  "Aangemeld",
  "Aan",
  "Uit",
  "Geregistreerd op",
];

const identity: Translator = (text) => text;

export function AttendeeListCard({
  projectId,
  enabled,
  attendeeUrl,
  attendees,
  t = identity,
}: {
  projectId: string;
  enabled: boolean;
  attendeeUrl: string;
  attendees: EventAttendee[];
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Attendee app")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            "Bezoekers kunnen zichzelf registreren voor hun eigen agenda en (optioneel) netwerken met andere bezoekers."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={setAttendeeAppEnabled.bind(null, projectId)} className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="attendee_app_enabled" defaultChecked={enabled} />
            {t("Attendee app aanzetten voor dit project")}
          </label>
          <SubmitButton size="sm">{t("Opslaan")}</SubmitButton>
        </form>

        {enabled && (
          <div className="space-y-2 border-t pt-4">
            <Label>{t("De attendee app staat aan. Deel deze link met bezoekers om zichzelf te registreren:")}</Label>
            <ShareLinkBox url={attendeeUrl} copyLabel={t("Kopieer link")} copiedLabel={t("Gekopieerd")} />
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <Label>{t("Geregistreerde bezoekers")}</Label>
          {attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nog geen bezoekers geregistreerd.")}</p>
          ) : (
            <ul className="space-y-2">
              {attendees.map((attendee) => (
                <li key={attendee.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{t(attendee.name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {[attendee.title, attendee.company].filter(Boolean).map((x) => t(x as string)).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={attendee.networking_opt_in ? "default" : "secondary"}>
                      {t("Netwerken")}: {attendee.networking_opt_in ? t("Aan") : t("Uit")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(attendee.created_at).toLocaleDateString("nl-NL")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
