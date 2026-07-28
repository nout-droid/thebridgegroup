"use client";

import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";

const STATIC_LABELS = [
  "Nieuw account aanmaken",
  "Start je proefperiode — geen creditcard nodig.",
  "Bedrijfsnaam",
  "E-mail",
  "Wachtwoord",
  "Bezig met aanmelden…",
  "Account aanmaken",
  "Heb je al een account?",
  "Inloggen",
];

export function SignupView({
  action,
  error,
  message,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
}) {
  const { lang, setLang, t } = useTranslator([...STATIC_LABELS, error ?? "", message ?? ""], []);

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-black bg-cover bg-center px-6 text-white"
      style={{ backgroundImage: "url(/login-background.jpg)" }}
    >
      <div className="flex w-full justify-end px-2 pt-4">
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </div>
      <div className="flex h-[20vh] shrink-0 items-end" />
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-sm">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={72} height={55} className="mb-4" />
        <h1 className="text-center font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
          {t("Nieuw account aanmaken")}
        </h1>
        <p className="mb-6 text-center text-sm text-white/70">
          {t("Start je proefperiode — geen creditcard nodig.")}
        </p>

        {error && (
          <p className="mb-4 w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
            {t(error)}
          </p>
        )}
        {message && (
          <p className="mb-4 w-full rounded-md bg-white/10 p-3 text-center text-sm text-white/70">
            {t(message)}
          </p>
        )}

        <form action={action} className="w-full space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-company" className="text-white/80">
              {t("Bedrijfsnaam")}
            </Label>
            <Input
              id="signup-company"
              name="company_name"
              required
              autoComplete="organization"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email" className="text-white/80">
              {t("E-mail")}
            </Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password" className="text-white/80">
              {t("Wachtwoord")}
            </Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <SubmitButton className="w-full" pendingText={t("Bezig met aanmelden…")}>
            {t("Account aanmaken")}
          </SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-white/60">
          {t("Heb je al een account?")}{" "}
          <Link href="/login" className="underline-offset-4 hover:text-white hover:underline">
            {t("Inloggen")}
          </Link>
        </p>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
