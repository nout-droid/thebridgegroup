import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-black bg-cover bg-center px-6 text-white"
      style={{ backgroundImage: "url(/login-background.jpg)" }}
    >
      <div className="h-[72vh] shrink-0" />
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-sm">
        <p className="mb-6 text-center text-sm text-white/70">Log in om je projecten te beheren.</p>

        {error && (
          <p className="mb-4 w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 w-full rounded-md bg-white/10 p-3 text-center text-sm text-white/70">
            {message}
          </p>
        )}

        <form action={signIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signin-email" className="text-white/80">E-mail</Label>
            <Input
              id="signin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signin-password" className="text-white/80">Wachtwoord</Label>
            <Input
              id="signin-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <SubmitButton className="w-full" pendingText="Bezig met inloggen…">
            Inloggen
          </SubmitButton>
        </form>

        <Link
          href="/login/reset-password"
          className="mt-4 block text-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          Wachtwoord vergeten?
        </Link>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
