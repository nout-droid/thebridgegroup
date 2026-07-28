import { ClientPortalLoginView } from "./client-portal-login-view";
import { loginClientAccount } from "./actions";

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <ClientPortalLoginView action={loginClientAccount} error={error} />;
}
