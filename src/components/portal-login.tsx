import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";

export function PortalLogin({
  description,
  idLabel,
  idName,
  idPlaceholder,
  passwordLabel = "Wachtwoord",
  error,
  action,
}: {
  description: string;
  idLabel: string;
  idName: string;
  idPlaceholder: string;
  passwordLabel?: string;
  error?: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <div className="flex w-full max-w-sm flex-col items-center">
        <Image src="/logo.png" alt="The Bridge AV Group" width={72} height={55} className="mb-4" />
        <h1 className="text-center text-lg font-semibold uppercase tracking-wide text-primary">
          The Bridge AV Group
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">{description}</p>

        {error && (
          <p className="mb-4 w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <form action={action} className="w-full space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={idName} className="text-white/80">
              {idLabel}
            </Label>
            <Input
              id={idName}
              name={idName}
              required
              autoFocus
              className="border-white/20 bg-white/5 text-white uppercase placeholder:text-white/30"
              placeholder={idPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80">
              {passwordLabel}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <SubmitButton className="w-full" pendingText="Bezig met inloggen…">
            Inloggen
          </SubmitButton>
        </form>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
