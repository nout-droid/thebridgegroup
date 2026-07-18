import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";
import { requestPasswordReset } from "@/app/auth/actions";

export default async function RequestPasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-lg font-semibold uppercase tracking-wide text-primary">
          Wachtwoord vergeten
        </h1>
        <p className="mb-6 text-center text-sm text-white/60">
          Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord in te stellen.
        </p>

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

        <form action={requestPasswordReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-white/80">E-mail</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <SubmitButton className="w-full" pendingText="Bezig…">
            Verstuur link
          </SubmitButton>
        </form>

        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          Terug naar inloggen
        </Link>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
