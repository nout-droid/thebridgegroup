import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectMedia } from "@/lib/types";
import {
  addProjectVideoLink,
  deleteProjectBackground,
  deleteProjectMedia,
  uploadProjectBackground,
  uploadProjectPhoto,
} from "./media-actions";
import type { Translator } from "@/lib/server/translate";

export const PROJECT_MEDIA_CARD_LABELS = [
  "Klantpagina content",
  "Achtergrond en renders/foto's/video's die op de klant-link te zien zijn.",
  "Achtergrond",
  "Verwijderen",
  "Vervangen",
  "Uploaden",
  "Foto's",
  "Foto",
  "Foto toevoegen",
  "Video-links",
  "YouTube/Vimeo-link",
  "Bijschrift (optioneel)",
  "Toevoegen",
];

const identity: Translator = (text) => text;

export function ProjectMediaCard({
  projectId,
  backgroundImageUrl,
  media,
  t = identity,
}: {
  projectId: string;
  backgroundImageUrl: string | null;
  media: ProjectMedia[];
  t?: Translator;
}) {
  const photos = media.filter((m) => m.kind === "photo");
  const videoLinks = media.filter((m) => m.kind === "video_link");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Klantpagina content")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Achtergrond en renders/foto's/video's die op de klant-link te zien zijn.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("Achtergrond")}</p>
          {backgroundImageUrl && (
            <div className="flex items-center gap-3">
              <Image
                src={backgroundImageUrl}
                alt={t("Achtergrond")}
                width={120}
                height={68}
                className="rounded-md object-cover"
                unoptimized
              />
              <form action={deleteProjectBackground.bind(null, projectId)}>
                <Button type="submit" size="sm" variant="ghost">
                  {t("Verwijderen")}
                </Button>
              </form>
            </div>
          )}
          <form
            action={uploadProjectBackground.bind(null, projectId)}
            className="flex items-center gap-2"
          >
            <Input type="file" name="file" accept="image/*" required className="max-w-xs" />
            <Button type="submit" size="sm">
              {backgroundImageUrl ? t("Vervangen") : t("Uploaden")}
            </Button>
          </form>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t("Foto's")}</p>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <div key={photo.id} className="space-y-1">
                  <Image
                    src={photo.url}
                    alt={photo.caption || t("Foto")}
                    width={150}
                    height={100}
                    className="aspect-video w-full rounded-md object-cover"
                    unoptimized
                  />
                  <form action={deleteProjectMedia.bind(null, projectId, photo.id)}>
                    <Button type="submit" size="sm" variant="ghost" className="h-6 w-full text-xs">
                      {t("Verwijderen")}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <form
            action={uploadProjectPhoto.bind(null, projectId)}
            className="flex items-center gap-2"
          >
            <Input type="file" name="file" accept="image/*" required className="max-w-xs" />
            <Button type="submit" size="sm">
              {t("Foto toevoegen")}
            </Button>
          </form>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t("Video-links")}</p>
          {videoLinks.length > 0 && (
            <ul className="space-y-1">
              {videoLinks.map((video) => (
                <li key={video.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{video.caption || video.url}</span>
                  <form action={deleteProjectMedia.bind(null, projectId, video.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {t("Verwijderen")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form
            action={addProjectVideoLink.bind(null, projectId)}
            className="flex items-center gap-2"
          >
            <Input name="url" placeholder={t("YouTube/Vimeo-link")} required className="max-w-xs" />
            <Input name="caption" placeholder={t("Bijschrift (optioneel)")} className="max-w-40" />
            <Button type="submit" size="sm">
              {t("Toevoegen")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
