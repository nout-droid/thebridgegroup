import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INTAKE_CHECKLIST_SECTIONS } from "@/lib/intake-checklist-sections";
import type { IntakeChecklistAnswer } from "@/lib/types";
import { saveIntakeChecklistAnswer } from "./intake-actions";

export function IntakeChecklistCard({
  projectId,
  answers,
}: {
  projectId: string;
  answers: IntakeChecklistAnswer[];
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
