"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";

type RegisterResult = { ok: true; accessCode: string } | { ok: false; error: string } | null;
type LoginResult = { ok: true } | { ok: false; error: string } | null;

const STATIC_LABELS = [
  "The Bridge Group B.V.",
  "Welkom bij de event app voor",
  "Nieuw hier? Registreer jezelf voor toegang tot je persoonlijke agenda.",
  "Nieuw aanmelden",
  "Ik heb al een account",
  "Naam",
  "E-mailadres",
  "Bedrijf",
  "Functie",
  "Registreren",
  "Bezig met registreren…",
  "Toegangscode",
  "Bezig met inloggen…",
  "Inloggen",
  "Handleiding",
  "Zelf ook zo'n tool voor je eigen events?",
  "Bekijk de abonnementen",
  "Je bent geregistreerd.",
  "Bewaar deze toegangscode — hiermee log je later weer in met je e-mailadres.",
  "Verder",
  "Vul je naam en (optioneel) e-mailadres, bedrijf en functie in.",
  "Log in met het e-mailadres waarmee je registreerde en je toegangscode.",
];

export function AttendeeLogin({
  organizationName,
  projectName,
  registerAction,
  loginAction,
}: {
  token: string;
  organizationName: string;
  projectName: string;
  registerAction: (formData: FormData) => Promise<RegisterResult>;
  loginAction: (formData: FormData) => Promise<LoginResult>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const dynamicTexts = [organizationName, projectName];
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);

  const [registerState, registerFormAction] = useActionState<RegisterResult, FormData>(
    async (_prev, formData) => registerAction(formData),
    null
  );
  const [loginState, loginFormAction] = useActionState<LoginResult, FormData>(
    async (_prev, formData) => loginAction(formData),
    null
  );

  useEffect(() => {
    if (loginState?.ok) router.refresh();
  }, [loginState, router]);

  const registered = registerState?.ok === true;

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-black bg-cover bg-center px-6 text-white"
      style={{ backgroundImage: "url(/login-background.jpg)" }}
    >
      <div className="flex w-full items-center justify-end gap-3 px-2 pt-4">
        <Link
          href="/guide"
          className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 hover:bg-white/10 hover:text-white"
        >
          {t("Handleiding")}
        </Link>
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </div>
      <div className="flex h-[28vh] shrink-0 items-end" />
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-sm">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={72} height={55} className="mb-4" />
        <h1 className="text-center font-heading text-2xl font-extrabold uppercase tracking-tight text-primary">
          {t(organizationName)}
        </h1>
        <p className="mb-6 text-center text-sm text-white/60">
          {t("Welkom bij de event app voor")} {t(projectName)}
        </p>

        {registered ? (
          <div className="w-full space-y-4 text-center">
            <p className="text-sm font-semibold text-primary">{t("Je bent geregistreerd.")}</p>
            <div className="rounded-md border border-white/20 bg-white/5 p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-white/50">{t("Toegangscode")}</p>
              <p className="font-mono text-2xl font-bold tracking-widest">
                {registerState && registerState.ok ? registerState.accessCode : ""}
              </p>
            </div>
            <p className="text-xs text-white/60">
              {t("Bewaar deze toegangscode — hiermee log je later weer in met je e-mailadres.")}
            </p>
            <Button className="w-full" onClick={() => router.refresh()}>
              {t("Verder")}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex w-full gap-1 rounded-md border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  mode === "register" ? "bg-primary text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {t("Nieuw aanmelden")}
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  mode === "login" ? "bg-primary text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {t("Ik heb al een account")}
              </button>
            </div>

            {mode === "register" ? (
              <form action={registerFormAction} className="w-full space-y-3">
                <p className="text-xs text-white/50">
                  {t("Vul je naam en (optioneel) e-mailadres, bedrijf en functie in.")}
                </p>
                {registerState?.ok === false && (
                  <p className="w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
                    {t(registerState.error)}
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-white/80">
                    {t("Naam")}
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    autoFocus
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/80">
                    {t("E-mailadres")}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-white/80">
                    {t("Bedrijf")}
                  </Label>
                  <Input
                    id="company"
                    name="company"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-white/80">
                    {t("Functie")}
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <SubmitButton className="w-full" pendingText={t("Bezig met registreren…")}>
                  {t("Registreren")}
                </SubmitButton>
              </form>
            ) : (
              <form action={loginFormAction} className="w-full space-y-3">
                <p className="text-xs text-white/50">
                  {t("Log in met het e-mailadres waarmee je registreerde en je toegangscode.")}
                </p>
                {loginState?.ok === false && (
                  <p className="w-full rounded-md bg-destructive/20 p-3 text-center text-sm text-destructive">
                    {t(loginState.error)}
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="login_email" className="text-white/80">
                    {t("E-mailadres")}
                  </Label>
                  <Input
                    id="login_email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="access_code" className="text-white/80">
                    {t("Toegangscode")}
                  </Label>
                  <Input
                    id="access_code"
                    name="access_code"
                    required
                    className="border-white/20 bg-white/5 text-white uppercase placeholder:text-white/30"
                  />
                </div>
                <SubmitButton className="w-full" pendingText={t("Bezig met inloggen…")}>
                  {t("Inloggen")}
                </SubmitButton>
              </form>
            )}
          </>
        )}

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
