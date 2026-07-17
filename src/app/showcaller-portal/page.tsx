import { PortalLogin } from "@/components/portal-login";
import { showcallerLogin } from "./actions";

export default async function ShowcallerPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PortalLogin
      description="Log in met het Event ID en showcaller-wachtwoord om de show rundown te bedienen en te editen."
      idLabel="Event ID"
      idName="event_code"
      idPlaceholder="bv. AB12CD"
      passwordLabel="Showcaller-wachtwoord"
      error={error}
      action={showcallerLogin}
    />
  );
}
