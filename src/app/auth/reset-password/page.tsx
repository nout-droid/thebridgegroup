import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";
import { updatePassword } from "../actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-lg font-semibold uppercase tracking-wide text-primary">
          Nieuw wachtwoord instellen
        </h1>
        <p className="mb-6 text-center text-sm text-white/60">
          Kies een nieuw wachtwoord voor je account.
        </p>

        {error && (
          <p className="mb-4 w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <form action={updatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-white/80">Nieuw wachtwoord</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-white/80">Herhaal wachtwoord</Label>
            <Input
              id="confirm-password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <SubmitButton className="w-full" pendingText="Bezig…">
            Wachtwoord opslaan
          </SubmitButton>
        </form>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
