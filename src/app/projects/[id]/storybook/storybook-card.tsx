import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StorybookChapter } from "@/lib/types";
import {
  addStorybookChapter,
  deleteStorybookChapter,
  deleteStorybookImage,
  moveStorybookChapter,
  updateStorybookChapter,
  uploadStorybookImage,
} from "./storybook-actions";
import type { Translator } from "@/lib/server/translate";

export const STORYBOOK_CARD_LABELS = [
  "Storybook",
  "Bouw een visueel sfeer/concept-verhaal per hoofdstuk — moodboards die je met de klant deelt, los van de ruwe media-galerij.",
  "Titel",
  "Beschrijving",
  "Opslaan",
  "Verwijderen",
  "Omhoog",
  "Omlaag",
  "Afbeeldingen",
  "Bijschrift (optioneel)",
  "Toevoegen",
  "Nieuw hoofdstuk",
  "bv. Entree, Hoofdpodium, Lounge, Verlichting",
  "Door klant goedgekeurd",
  "Storybook downloaden",
];

const identity: Translator = (text) => text;

export function StorybookCard({
  projectId,
  chapters,
  t = identity,
}: {
  projectId: string;
  chapters: StorybookChapter[];
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Storybook")}</CardTitle>
          {chapters.length > 0 && (
            <a
              href={`/projects/${projectId}/storybook/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {t("Storybook downloaden")}
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            "Bouw een visueel sfeer/concept-verhaal per hoofdstuk — moodboards die je met de klant deelt, los van de ruwe media-galerij."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {chapters.map((chapter, index) => (
          <div key={chapter.id} className="space-y-3 rounded-md border p-3">
            <form
              action={updateStorybookChapter.bind(null, projectId, chapter.id)}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  name="title"
                  defaultValue={chapter.title}
                  className="h-8 text-sm font-medium"
                  required
                />
                {chapter.client_approved_at && (
                  <Badge variant="outline" className="whitespace-nowrap text-xs">
                    {t("Door klant goedgekeurd")}
                  </Badge>
                )}
              </div>
              <Textarea
                name="description"
                defaultValue={chapter.description}
                rows={2}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" className="h-7 text-xs">
                  {t("Opslaan")}
                </Button>
                <Button
                  type="submit"
                  formAction={moveStorybookChapter.bind(null, projectId, chapter.id, "up")}
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  className="h-7 text-xs"
                >
                  {t("Omhoog")}
                </Button>
                <Button
                  type="submit"
                  formAction={moveStorybookChapter.bind(null, projectId, chapter.id, "down")}
                  size="sm"
                  variant="ghost"
                  disabled={index === chapters.length - 1}
                  className="h-7 text-xs"
                >
                  {t("Omlaag")}
                </Button>
                <Button
                  type="submit"
                  formAction={deleteStorybookChapter.bind(null, projectId, chapter.id)}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                >
                  {t("Verwijderen")}
                </Button>
              </div>
            </form>

            <div className="space-y-2 border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground">{t("Afbeeldingen")}</p>
              {chapter.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {chapter.images.map((image) => (
                    <div key={image.id} className="space-y-1">
                      <Image
                        src={image.url}
                        alt={image.caption || chapter.title}
                        width={150}
                        height={100}
                        className="aspect-video w-full rounded-md object-cover"
                        unoptimized
                      />
                      <form action={deleteStorybookImage.bind(null, projectId, image.id)}>
                        <Button type="submit" size="sm" variant="ghost" className="h-6 w-full text-xs">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <form
                action={uploadStorybookImage.bind(null, projectId, chapter.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <Input type="file" name="file" accept="image/*" required className="h-8 max-w-xs text-xs" />
                <Input
                  name="caption"
                  placeholder={t("Bijschrift (optioneel)")}
                  className="h-8 max-w-40 text-xs"
                />
                <Button type="submit" size="sm" className="h-8 text-xs">
                  {t("Toevoegen")}
                </Button>
              </form>
            </div>
          </div>
        ))}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t("Nieuw hoofdstuk")}</p>
          <form action={addStorybookChapter.bind(null, projectId)} className="space-y-2">
            <Input name="title" placeholder={t("bv. Entree, Hoofdpodium, Lounge, Verlichting")} required />
            <Textarea name="description" placeholder={t("Beschrijving")} rows={2} />
            <Button type="submit" size="sm">
              {t("Toevoegen")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
