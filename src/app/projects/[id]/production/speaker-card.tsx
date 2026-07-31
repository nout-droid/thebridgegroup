import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import type { Speaker, Stage } from "@/lib/types";
import { StageSelect } from "../stage-select";
import { addSpeaker, deleteSpeaker, updateSpeaker } from "./speaker-actions";
import type { Translator } from "@/lib/server/translate";

export const SPEAKER_CARD_LABELS = [
  "Sprekers",
  "Registreer sprekers, wijs een podium toe en verzamel hun presentatie en notities voor de showcaller.",
  "Naam",
  "Functie",
  "bv. CEO",
  "Bedrijf",
  "Podium",
  "Kies podium",
  "Bio",
  "Notities voor de showcaller",
  "bv. Heeft 2 minuten omwisseltijd nodig, gebruikt liever een clicker dan een afstandsbediening",
  "Presentatie",
  "Huidige presentatie: ",
  "Bekijken",
  "Nog geen presentatie geüpload.",
  "Nieuw bestand uploaden (vervangt de huidige)",
  "Opslaan",
  "Verwijderen",
  "Spreker toevoegen",
];

const identity: Translator = (text) => text;

export interface SpeakerRow extends Speaker {
  presentationSignedUrl: string | null;
}

export function SpeakerCard({
  projectId,
  speakers,
  stages,
  t = identity,
}: {
  projectId: string;
  speakers: SpeakerRow[];
  stages: Stage[];
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Sprekers")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            "Registreer sprekers, wijs een podium toe en verzamel hun presentatie en notities voor de showcaller."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {speakers.map((speaker) => (
          <form
            key={speaker.id}
            action={updateSpeaker.bind(null, projectId, speaker.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
          >
            <div className="space-y-1">
              <Label htmlFor={`name-${speaker.id}`} className="text-xs">{t("Naam")}</Label>
              <Input
                id={`name-${speaker.id}`}
                name="name"
                defaultValue={speaker.name}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`title-${speaker.id}`} className="text-xs">{t("Functie")}</Label>
              <Input
                id={`title-${speaker.id}`}
                name="title"
                defaultValue={speaker.title}
                placeholder={t("bv. CEO")}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`company-${speaker.id}`} className="text-xs">{t("Bedrijf")}</Label>
              <Input
                id={`company-${speaker.id}`}
                name="company"
                defaultValue={speaker.company}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`stage-${speaker.id}`} className="text-xs">{t("Podium")}</Label>
              <StageSelect
                id={`stage-${speaker.id}`}
                defaultValue={speaker.stage_id ?? undefined}
                stages={stages}
                placeholder={t("Kies podium")}
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`bio-${speaker.id}`} className="text-xs">{t("Bio")}</Label>
              <Textarea
                id={`bio-${speaker.id}`}
                name="bio"
                defaultValue={speaker.bio}
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`notes-${speaker.id}`} className="text-xs">
                {t("Notities voor de showcaller")}
              </Label>
              <Textarea
                id={`notes-${speaker.id}`}
                name="notes_for_showcaller"
                defaultValue={speaker.notes_for_showcaller}
                placeholder={t(
                  "bv. Heeft 2 minuten omwisseltijd nodig, gebruikt liever een clicker dan een afstandsbediening"
                )}
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`file-${speaker.id}`} className="text-xs">{t("Presentatie")}</Label>
              {speaker.presentationSignedUrl ? (
                <p className="text-xs text-muted-foreground">
                  {t("Huidige presentatie: ")}
                  <a
                    href={speaker.presentationSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {speaker.presentation_filename || t("Bekijken")}
                  </a>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("Nog geen presentatie geüpload.")}</p>
              )}
              <Input
                id={`file-${speaker.id}`}
                name="file"
                type="file"
                className="h-8 text-xs"
                title={t("Nieuw bestand uploaden (vervangt de huidige)")}
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-4">
              <SubmitButton size="sm" className="h-8 text-xs">
                {t("Opslaan")}
              </SubmitButton>
              <Button
                type="submit"
                formAction={deleteSpeaker.bind(null, projectId, speaker.id)}
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
          action={addSpeaker.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor="new-speaker-name" className="text-xs">{t("Naam")}</Label>
            <Input id="new-speaker-name" name="name" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-speaker-title" className="text-xs">{t("Functie")}</Label>
            <Input id="new-speaker-title" name="title" placeholder={t("bv. CEO")} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-speaker-company" className="text-xs">{t("Bedrijf")}</Label>
            <Input id="new-speaker-company" name="company" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-speaker-stage" className="text-xs">{t("Podium")}</Label>
            <StageSelect id="new-speaker-stage" stages={stages} placeholder={t("Kies podium")} />
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="new-speaker-bio" className="text-xs">{t("Bio")}</Label>
            <Textarea id="new-speaker-bio" name="bio" rows={2} className="text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="new-speaker-notes" className="text-xs">
              {t("Notities voor de showcaller")}
            </Label>
            <Textarea
              id="new-speaker-notes"
              name="notes_for_showcaller"
              placeholder={t(
                "bv. Heeft 2 minuten omwisseltijd nodig, gebruikt liever een clicker dan een afstandsbediening"
              )}
              rows={2}
              className="text-xs"
            />
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="new-speaker-file" className="text-xs">{t("Presentatie")}</Label>
            <Input id="new-speaker-file" name="file" type="file" className="h-8 text-xs" />
          </div>
          <div className="sm:col-span-4">
            <SubmitButton size="sm" className="h-8 text-xs">
              {t("Spreker toevoegen")}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
