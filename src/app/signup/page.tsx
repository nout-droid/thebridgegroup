import { SignupView } from "./signup-view";
import { signUp } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  return <SignupView action={signUp} error={error} message={message} />;
}
