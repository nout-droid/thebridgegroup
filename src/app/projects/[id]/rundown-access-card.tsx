import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Project, Stage } from "@/lib/types";
import {
  setCrewPassword,
  setShowcallerPassword,
  setStageShowcallerPassword,
} from "./rundown-access-actions";
import type { Translator } from "@/lib/server/translate";

export const RUNDOWN_ACCESS_CARD_LABELS = [
  "Live toegang",
  "Crew en showcaller loggen in met hetzelfde Event ID (",
  ") en hun eigen wachtwoord.",
  "Crew — live meekijken + notes per devisie",
  "Nieuw crew-wachtwoord",
  "Crew-wachtwoord instellen",
  "Opslaan",
  "Nog geen wachtwoord ingesteld — crew kan nog niet inloggen.",
  "Showcaller — show bedienen en rundown editen",
  "Nieuw showcaller-wachtwoord",
  "Showcaller-wachtwoord instellen",
  "Nog geen wachtwoord ingesteld — de showcaller kan nog niet inloggen.",
  "Optioneel: geef een podium een eigen, beperkter wachtwoord — die showcaller ziet en bedient dan alleen dat podium, in plaats van alle podia.",
  "Nieuw wachtwoord voor",
  "Wachtwoord voor",
  "instellen",
];

const identity: Translator = (text) => text;

export function RundownAccessCard({
  project,
  stages,
  crewPortalUrl,
  showcallerPortalUrl,
  t = identity,
}: {
  project: Project;
  stages: Stage[];
  crewPortalUrl: string;
  showcallerPortalUrl: string;
  t?: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Live toegang")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Crew en showcaller loggen in met hetzelfde Event ID (")}
          <span className="font-mono">{project.event_code}</span>
          {t(") en hun eigen wachtwoord.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t("Crew — live meekijken + notes per devisie")}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{crewPortalUrl}</span>
          </p>
          <form
            action={setCrewPassword.bind(null, project.id)}
            className="flex items-end gap-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="crew_password">
                {project.crew_password_hash ? t("Nieuw crew-wachtwoord") : t("Crew-wachtwoord instellen")}
              </Label>
              <Input
                id="crew_password"
                name="password"
                type="password"
                className="w-40"
                required
              />
            </div>
            <Button type="submit" size="sm">
              {t("Opslaan")}
            </Button>
          </form>
          {!project.crew_password_hash && (
            <p className="text-xs text-destructive">
              {t("Nog geen wachtwoord ingesteld — crew kan nog niet inloggen.")}
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t("Showcaller — show bedienen en rundown editen")}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{showcallerPortalUrl}</span>
          </p>
          <form
            action={setShowcallerPassword.bind(null, project.id)}
            className="flex items-end gap-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="showcaller_password">
                {project.showcaller_password_hash
                  ? t("Nieuw showcaller-wachtwoord")
                  : t("Showcaller-wachtwoord instellen")}
              </Label>
              <Input
                id="showcaller_password"
                name="password"
                type="password"
                className="w-40"
                required
              />
            </div>
            <Button type="submit" size="sm">
              {t("Opslaan")}
            </Button>
          </form>
          {!project.showcaller_password_hash && (
            <p className="text-xs text-destructive">
              {t("Nog geen wachtwoord ingesteld — de showcaller kan nog niet inloggen.")}
            </p>
          )}

          {stages.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {t(
                  "Optioneel: geef een podium een eigen, beperkter wachtwoord — die showcaller ziet en bedient dan alleen dat podium, in plaats van alle podia."
                )}
              </p>
              {stages.map((stage) => (
                <form
                  key={stage.id}
                  action={setStageShowcallerPassword.bind(null, project.id, stage.id)}
                  className="flex items-end gap-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={`stage_showcaller_password_${stage.id}`}>
                      {stage.showcaller_password_hash
                        ? `${t("Nieuw wachtwoord voor")} ${stage.name}`
                        : `${t("Wachtwoord voor")} ${stage.name} ${t("instellen")}`}
                    </Label>
                    <Input
                      id={`stage_showcaller_password_${stage.id}`}
                      name="password"
                      type="password"
                      className="w-40"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" variant="secondary">
                    {t("Opslaan")}
                  </Button>
                </form>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
