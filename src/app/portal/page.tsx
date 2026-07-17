import { PortalLogin } from "@/components/portal-login";
import { clientLogin } from "./actions";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PortalLogin
      description="Log in met het Event ID en wachtwoord dat je hebt ontvangen om je begroting te bekijken."
      idLabel="Event ID"
      idName="event_code"
      idPlaceholder="bv. AB12CD"
      error={error}
      action={clientLogin}
    />
  );
}
