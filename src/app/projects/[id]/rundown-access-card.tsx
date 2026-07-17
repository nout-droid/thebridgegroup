import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";
import { setCrewPassword, setShowcallerPassword } from "./rundown-access-actions";

export function RundownAccessCard({
  project,
  crewPortalUrl,
  showcallerPortalUrl,
}: {
  project: Project;
  crewPortalUrl: string;
  showcallerPortalUrl: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live toegang</CardTitle>
        <p className="text-sm text-muted-foreground">
          Crew en showcaller loggen in met hetzelfde Event ID (
          <span className="font-mono">{project.event_code}</span>) en hun eigen wachtwoord.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Crew &mdash; live meekijken + notes per devisie</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{crewPortalUrl}</span>
          </p>
          <form
            action={setCrewPassword.bind(null, project.id)}
            className="flex items-end gap-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="crew_password">
                {project.crew_password_hash ? "Nieuw crew-wachtwoord" : "Crew-wachtwoord instellen"}
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
              Opslaan
            </Button>
          </form>
          {!project.crew_password_hash && (
            <p className="text-xs text-destructive">
              Nog geen wachtwoord ingesteld &mdash; crew kan nog niet inloggen.
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Showcaller &mdash; show bedienen en rundown editen</p>
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
                  ? "Nieuw showcaller-wachtwoord"
                  : "Showcaller-wachtwoord instellen"}
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
              Opslaan
            </Button>
          </form>
          {!project.showcaller_password_hash && (
            <p className="text-xs text-destructive">
              Nog geen wachtwoord ingesteld &mdash; de showcaller kan nog niet inloggen.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
