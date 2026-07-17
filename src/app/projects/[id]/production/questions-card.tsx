import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MeetingNote, OpenQuestion } from "@/lib/types";
import {
  addMeetingNote,
  addOpenQuestion,
  deleteMeetingNote,
  deleteOpenQuestion,
  updateMeetingNote,
  updateOpenQuestion,
} from "./questions-actions";

export function QuestionsCard({
  projectId,
  questions,
  notes,
}: {
  projectId: string;
  questions: OpenQuestion[];
  notes: MeetingNote[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open vragen</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vragen richting opdrachtgever of leveranciers, met antwoord zodra bekend.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q) => (
            <form
              key={q.id}
              action={updateOpenQuestion.bind(null, projectId, q.id)}
              className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2"
            >
              <div className="space-y-1">
                <Label htmlFor={`question-${q.id}`} className="text-xs">Vraag</Label>
                <Input
                  id={`question-${q.id}`}
                  name="question"
                  defaultValue={q.question}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`answer-${q.id}`} className="text-xs">Antwoord</Label>
                <Input
                  id={`answer-${q.id}`}
                  name="answer"
                  defaultValue={q.answer}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    name="pending"
                    defaultChecked={q.pending}
                    className="h-4 w-4"
                  />
                  Nog open
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="h-8 text-xs">
                    Opslaan
                  </Button>
                  <Button
                    type="submit"
                    formAction={deleteOpenQuestion.bind(null, projectId, q.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                  >
                    Verwijderen
                  </Button>
                </div>
              </div>
            </form>
          ))}

          <form
            action={addOpenQuestion.bind(null, projectId)}
            className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-2"
          >
            <div className="space-y-1">
              <Label htmlFor="new-question" className="text-xs">Vraag</Label>
              <Input id="new-question" name="question" className="h-8 text-xs" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-answer" className="text-xs">Antwoord</Label>
              <Input id="new-answer" name="answer" className="h-8 text-xs" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Vraag toevoegen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notulen</CardTitle>
          <p className="text-sm text-muted-foreground">Losse aantekeningen uit overleg.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes.map((note) => (
            <form
              key={note.id}
              action={updateMeetingNote.bind(null, projectId, note.id)}
              className="flex items-end gap-2 rounded-md border p-3"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={`note-${note.id}`} className="text-xs">Notitie</Label>
                <Input
                  id={`note-${note.id}`}
                  name="note"
                  defaultValue={note.note}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteMeetingNote.bind(null, projectId, note.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </form>
          ))}

          <form action={addMeetingNote.bind(null, projectId)} className="flex items-end gap-2 border-t pt-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-note" className="text-xs">Notitie</Label>
              <Input id="new-note" name="note" className="h-8 text-xs" required />
            </div>
            <Button type="submit" size="sm" className="h-8 text-xs">
              Toevoegen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
