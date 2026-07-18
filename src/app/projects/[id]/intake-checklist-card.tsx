import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INTAKE_CHECKLIST_SECTIONS } from "@/lib/intake-checklist-sections";
import type { IntakeChecklistAnswer } from "@/lib/types";
import {
  deleteIntakeChecklistPhoto,
  saveIntakeChecklistAnswer,
  uploadIntakeChecklistPhoto,
} from "./intake-actions";

export interface IntakeChecklistPhotoWithUrl {
  id: string;
  section_key: string;
  original_filename: string;
  uploaded_by: "owner" | "client";
  url: string | null;
}

export function IntakeChecklistCard({
  projectId,
  answers,
  photos,
}: {
  projectId: string;
  answers: IntakeChecklistAnswer[];
  photos: IntakeChecklistPhotoWithUrl[];
}) {
  const answerByKey = new Map(answers.map((a) => [a.section_key, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aanvraag checklist</CardTitle>
        <p className="text-sm text-muted-foreground">
          De klant kan dit zelf invullen in het klantportaal (NL of EN). Jij kunt hier ook
          zelf antwoorden invullen of aanvullen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {INTAKE_CHECKLIST_SECTIONS.map((section) => {
          const answer = answerByKey.get(section.key);
          const sectionPhotos = photos.filter((p) => p.section_key === section.key);
          return (
            <div key={section.key} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{section.title_nl}</p>
                {answer?.updated_by === "client" && (
                  <Badge variant="secondary">Ingevuld door klant</Badge>
                )}
              </div>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                {section.guidance_nl.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <form
                action={saveIntakeChecklistAnswer.bind(null, projectId, section.key)}
                className="space-y-2"
              >
                <Textarea name="content" defaultValue={answer?.content ?? ""} rows={3} />
                <Button type="submit" size="sm">
                  Opslaan
                </Button>
              </form>

              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Bijlagen</p>
                {sectionPhotos.length > 0 && (
                  <ul className="space-y-1">
                    {sectionPhotos.map((photo) => (
                      <li
                        key={photo.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {photo.url ? (
                            <a
                              href={photo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {photo.original_filename}
                            </a>
                          ) : (
                            photo.original_filename
                          )}
                          {photo.uploaded_by === "client" && (
                            <Badge variant="secondary">Klant</Badge>
                          )}
                        </span>
                        <form action={deleteIntakeChecklistPhoto.bind(null, projectId, photo.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            Verwijderen
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  action={uploadIntakeChecklistPhoto.bind(null, projectId, section.key)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <Input
                    type="file"
                    name="file"
                    accept="image/*,.pdf"
                    required
                    className="h-8 max-w-xs text-xs"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                    Bijlage toevoegen
                  </Button>
                </form>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
