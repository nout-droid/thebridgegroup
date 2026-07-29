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
  "The Bridge Group B.V.",
  "Log in om al je projecten in één overzicht te zien.",
  "E-mailadres",
  "Wachtwoord",
  "Bezig met inloggen…",
  "Inloggen",
  "Toegang tot één specifiek project?",
  "Log hier in",
  "Zelf ook zo'n tool voor je eigen events?",
  "Bekijk de abonnementen",
];

export function ClientPortalLoginView({
  action,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
}) {
  const { lang, setLang, t } = useTranslator([...STATIC_LABELS, error ?? ""], [], "en");

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-black bg-cover bg-center px-6 text-white"
      style={{ backgroundImage: "url(/login-background.jpg)" }}
    >
      <div className="flex w-full justify-end px-2 pt-4">
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </div>
      <div className="flex h-[68vh] shrink-0 items-end" />
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-sm">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={72} height={55} className="mb-4" />
        <h1 className="text-center font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
          {t("The Bridge Group B.V.")}
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">
          {t("Log in om al je projecten in één overzicht te zien.")}
        </p>

        {error && (
          <p className="mb-4 w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
            {t(error)}
          </p>
        )}

        <form action={action} className="w-full space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">
              {t("E-mailadres")}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80">
              {t("Wachtwoord")}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <SubmitButton className="w-full" pendingText={t("Bezig met inloggen…")}>
            {t("Inloggen")}
          </SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-white/60">
          {t("Toegang tot één specifiek project?")}{" "}
          <Link href="/portal" className="underline-offset-4 hover:text-white hover:underline">
            {t("Log hier in")}
          </Link>
        </p>

        <p className="mt-6 text-center text-xs text-white/40">
          {t("Zelf ook zo'n tool voor je eigen events?")}{" "}
          <Link href="/pricing" className="text-white/70 underline-offset-4 hover:text-white hover:underline">
            {t("Bekijk de abonnementen")}
          </Link>
        </p>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
