import { PortalLogin } from "@/components/portal-login";
import { guestLogin } from "./actions";

export default async function GuestPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PortalLogin
      description="Log in met het Event ID en gastenwachtwoord om de documenten voor dit event te bekijken (bv. riders)."
      idLabel="Event ID"
      idName="event_code"
      idPlaceholder="bv. AB12CD"
      passwordLabel="Gastenwachtwoord"
      error={error}
      action={guestLogin}
    />
  );
}
