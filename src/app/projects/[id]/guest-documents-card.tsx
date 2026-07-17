import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { GuestDocument, Project } from "@/lib/types";
import { deleteGuestDocument, setGuestPassword, uploadGuestDocument } from "./guest-actions";

export function GuestDocumentsCard({
  project,
  documents,
}: {
  project: Project;
  documents: GuestDocument[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gastenportaal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Documenten (bv. riders) voor gasten — zelfde Event ID als de klant, met een eigen
          wachtwoord. Geen budgetdata zichtbaar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={setGuestPassword.bind(null, project.id)} className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="guest_password">
              {project.guest_password_hash ? "Nieuw gastenwachtwoord" : "Gastenwachtwoord instellen"}
            </Label>
            <Input id="guest_password" name="password" type="password" className="w-40" required />
          </div>
          <Button type="submit" size="sm">
            Opslaan
          </Button>
        </form>
        {!project.guest_password_hash && (
          <p className="text-xs text-destructive">
            Nog geen gastenwachtwoord ingesteld — gasten kunnen nog niet inloggen.
          </p>
        )}

        <div className="space-y-2 border-t pt-4">
          {documents.length > 0 && (
            <ul className="space-y-1">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between text-sm">
                  <span>
                    {document.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({new Date(document.created_at).toLocaleDateString("nl-NL")})
                    </span>
                  </span>
                  <form action={deleteGuestDocument.bind(null, project.id, document.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Verwijderen
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form
            action={uploadGuestDocument.bind(null, project.id)}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" name="title" placeholder="bv. Technical rider" required className="w-40" />
            </div>
            <Input type="file" name="file" required className="max-w-xs" />
            <Button type="submit" size="sm">
              Document toevoegen
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
