import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { GuestDocument, Project } from "@/lib/types";
import { deleteGuestDocument, setGuestPassword, uploadGuestDocument } from "./guest-actions";
import type { Translator } from "@/lib/server/translate";

export const GUEST_DOCUMENTS_CARD_LABELS = [
  "Gastenportaal",
  "Documenten (bv. riders) voor gasten — zelfde Event ID als de klant, met een eigen wachtwoord. Geen budgetdata zichtbaar.",
  "Nieuw gastenwachtwoord",
  "Gastenwachtwoord instellen",
  "Opslaan",
  "Nog geen gastenwachtwoord ingesteld — gasten kunnen nog niet inloggen.",
  "Verwijderen",
  "Titel",
  "bv. Technical rider",
  "Document toevoegen",
  "Door gast geüpload",
];

const identity: Translator = (text) => text;

export function GuestDocumentsCard({
  project,
  documents,
  t = identity,
}: {
  project: Project;
  documents: GuestDocument[];
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Gastenportaal")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            "Documenten (bv. riders) voor gasten — zelfde Event ID als de klant, met een eigen wachtwoord. Geen budgetdata zichtbaar."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={setGuestPassword.bind(null, project.id)} className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="guest_password">
              {project.guest_password_hash ? t("Nieuw gastenwachtwoord") : t("Gastenwachtwoord instellen")}
            </Label>
            <Input id="guest_password" name="password" type="password" className="w-40" required />
          </div>
          <Button type="submit" size="sm">
            {t("Opslaan")}
          </Button>
        </form>
        {!project.guest_password_hash && (
          <p className="text-xs text-destructive">
            {t("Nog geen gastenwachtwoord ingesteld — gasten kunnen nog niet inloggen.")}
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
                    {document.uploaded_by === "guest" && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t("Door gast geüpload")}
                      </span>
                    )}
                  </span>
                  <form action={deleteGuestDocument.bind(null, project.id, document.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {t("Verwijderen")}
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
              <Label htmlFor="title">{t("Titel")}</Label>
              <Input id="title" name="title" placeholder={t("bv. Technical rider")} required className="w-40" />
            </div>
            <Input type="file" name="file" required className="max-w-xs" />
            <Button type="submit" size="sm">
              {t("Document toevoegen")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
