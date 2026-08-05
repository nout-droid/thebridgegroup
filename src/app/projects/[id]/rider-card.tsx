import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RiderSection } from "@/lib/types";
import {
  addRiderSection,
  addRiderSectionItem,
  deleteRiderSection,
  deleteRiderSectionItem,
  deleteRiderSectionAttachment,
  moveRiderSection,
  updateRiderSection,
  uploadRiderSectionAttachment,
} from "./rider-actions";
import type { Translator } from "@/lib/server/translate";

export const RIDER_CARD_LABELS = [
  "Rider downloaden",
  "Callsheet downloaden",
  "Onderdelen die je markeert als \"klant mag invullen\" worden bewerkbaar in het klantportaal.",
  "Klant vult in",
  "Op callsheet",
  "Klant mag dit invullen",
  "Regels",
  "Verwijderen",
  "bv. 2x extra PAR lamp",
  "Regel toevoegen",
  "Nieuw onderdeel",
  "bv. Catering",
  "Onderdeel toevoegen",
  "Opslaan",
  "Bijlagen",
  "Klant",
  "Bijlage toevoegen",
];

const identity: Translator = (text) => text;

export function RiderCard({
  projectId,
  stageId,
  riderId,
  sections,
  title = "Rider",
  showDownloadLinks = true,
  t = identity,
}: {
  projectId: string;
  stageId: string | null;
  riderId: string | null;
  sections: RiderSection[];
  title?: string;
  showDownloadLinks?: boolean;
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t(title)}</CardTitle>
          {riderId && showDownloadLinks && (
            <div className="flex items-center gap-3">
              <a
                href={`/projects/${projectId}/rider/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                {t("Rider downloaden")}
              </a>
              <a
                href={`/projects/${projectId}/rider/callsheet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                {t("Callsheet downloaden")}
              </a>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'Onderdelen die je markeert als "klant mag invullen" worden bewerkbaar in het klantportaal.'
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section, index) => (
          <div key={section.id} className="space-y-3 rounded-md border p-3">
            <form
              action={updateRiderSection.bind(null, projectId, stageId, section.id)}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  name="title"
                  defaultValue={section.title}
                  className="max-w-xs font-medium"
                  required
                />
                <div className="flex items-center gap-2">
                  {section.editable_by_client && <Badge variant="secondary">{t("Klant vult in")}</Badge>}
                  {section.include_in_callsheet && <Badge variant="secondary">{t("Op callsheet")}</Badge>}
                  <div className="flex gap-1">
                    <Button
                      type="submit"
                      formAction={moveRiderSection.bind(
                        null,
                        projectId,
                        stageId,
                        riderId ?? "",
                        section.id,
                        "up"
                      )}
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                    >
                      &uarr;
                    </Button>
                    <Button
                      type="submit"
                      formAction={moveRiderSection.bind(
                        null,
                        projectId,
                        stageId,
                        riderId ?? "",
                        section.id,
                        "down"
                      )}
                      size="sm"
                      variant="ghost"
                      disabled={index === sections.length - 1}
                    >
                      &darr;
                    </Button>
                  </div>
                </div>
              </div>
              <Textarea name="content" defaultValue={section.content} rows={3} />
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      name="editable_by_client"
                      defaultChecked={section.editable_by_client}
                      className="h-4 w-4"
                    />
                    {t("Klant mag dit invullen")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      name="include_in_callsheet"
                      defaultChecked={section.include_in_callsheet}
                      className="h-4 w-4"
                    />
                    {t("Op callsheet")}
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    {t("Opslaan")}
                  </Button>
                  <Button
                    type="submit"
                    formAction={deleteRiderSection.bind(null, projectId, stageId, section.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("Verwijderen")}
                  </Button>
                </div>
              </div>
            </form>

            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">{t("Regels")}</p>
              {(section.items ?? []).length > 0 && (
                <ul className="space-y-1">
                  {(section.items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{item.description}</span>
                      <form action={deleteRiderSectionItem.bind(null, projectId, stageId, item.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form
                action={addRiderSectionItem.bind(null, projectId, stageId, section.id)}
                className="flex gap-2"
              >
                <Input
                  name="description"
                  placeholder={t("bv. 2x extra PAR lamp")}
                  className="h-8 text-xs"
                  required
                />
                <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0 text-xs">
                  {t("Regel toevoegen")}
                </Button>
              </form>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">{t("Bijlagen")}</p>
              {(section.attachments ?? []).length > 0 && (
                <ul className="space-y-1">
                  {(section.attachments ?? []).map((attachment) => (
                    <li key={attachment.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        {attachment.url ? (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            {attachment.original_filename}
                          </a>
                        ) : (
                          attachment.original_filename
                        )}
                        {attachment.uploaded_by === "client" && (
                          <Badge variant="secondary">{t("Klant")}</Badge>
                        )}
                      </span>
                      <form
                        action={deleteRiderSectionAttachment.bind(null, projectId, stageId, attachment.id)}
                      >
                        <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form
                action={uploadRiderSectionAttachment.bind(null, projectId, stageId, section.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <Input
                  type="file"
                  name="file"
                  required
                  className="h-8 max-w-xs text-xs"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                  {t("Bijlage toevoegen")}
                </Button>
              </form>
            </div>
          </div>
        ))}

        <form action={addRiderSection.bind(null, projectId, stageId)} className="space-y-2 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("Nieuw onderdeel")}</Label>
            <Input id="title" name="title" placeholder={t("bv. Catering")} required className="max-w-xs" />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="editable_by_client" className="h-4 w-4" />
              {t("Klant mag dit invullen")}
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="include_in_callsheet" className="h-4 w-4" />
              {t("Op callsheet")}
            </label>
          </div>
          <Button type="submit" size="sm">
            {t("Onderdeel toevoegen")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
