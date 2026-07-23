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
  children,
}: {
  description: string;
  idLabel: string;
  idName: string;
  idPlaceholder: string;
  passwordLabel?: string;
  error?: string;
  action: (formData: FormData) => void | Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center bg-black bg-cover bg-center px-6 text-white"
      style={{ backgroundImage: "url(/login-background.jpg)" }}
    >
      <div className="h-[72vh] shrink-0" />
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-sm">
        <Image src="/logo.png" alt="The Bridge AV Group" width={72} height={55} className="mb-4" />
        <h1 className="text-center font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
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
          {children}
          <SubmitButton className="w-full" pendingText="Bezig met inloggen…">
            Inloggen
          </SubmitButton>
        </form>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
