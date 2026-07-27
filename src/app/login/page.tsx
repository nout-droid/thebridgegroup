import { signIn } from "./actions";
import { LoginView } from "./login-view";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return <LoginView action={signIn} error={error} message={message} />;
}
