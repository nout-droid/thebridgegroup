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
    />
  );
}
