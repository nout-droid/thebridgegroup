import { PortalLogin } from "@/components/portal-login";
import { supplierLogin } from "./actions";

export default async function SupplierPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PortalLogin
      description="Log in met de leverancierscode en het wachtwoord dat je van The Bridge AV Group hebt ontvangen om offertes te bekijken en te uploaden."
      idLabel="Leverancierscode"
      idName="portal_code"
      idPlaceholder="bv. AB12CD"
      error={error}
      action={supplierLogin}
    />
  );
}
