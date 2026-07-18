import { Label } from "@/components/ui/label";
import { DivisionSelect } from "@/components/division-select";
import { PortalLogin } from "@/components/portal-login";
import { crewLogin } from "./actions";

export default async function CrewPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PortalLogin
      description="Log in met het Event ID en crew-wachtwoord om live mee te kijken met de show rundown en notes toe te voegen voor je devisie."
      idLabel="Event ID"
      idName="event_code"
      idPlaceholder="bv. AB12CD"
      passwordLabel="Crew-wachtwoord"
      error={error}
      action={crewLogin}
    >
      <div className="space-y-1.5">
        <Label htmlFor="division" className="text-white/80">
          Jouw devisie
        </Label>
        <DivisionSelect
          id="division"
          triggerClassName="w-full border-white/20 bg-white/5 text-white"
        />
      </div>
    </PortalLogin>
  );
}
