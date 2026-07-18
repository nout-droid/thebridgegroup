import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Footer } from "@/components/footer";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <div className="flex w-full max-w-sm flex-col items-center">
        <Image src="/logo.png" alt="The Bridge AV Group" width={72} height={55} className="mb-4" />
        <h1 className="text-center text-lg font-semibold uppercase tracking-wide text-primary">
          The Bridge — Productie
        </h1>
        <p className="mb-8 text-center text-sm text-white/60">Log in om je projecten te beheren.</p>

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

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="w-full bg-white/10">
            <TabsTrigger
              value="signin"
              className="flex-1 text-white/60 data-active:bg-white data-active:text-black"
            >
              Inloggen
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="flex-1 text-white/60 data-active:bg-white data-active:text-black"
            >
              Account aanmaken
            </TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form action={signIn} className="mt-4 space-y-4">
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
          </TabsContent>
          <TabsContent value="signup">
            <form action={signUp} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-white/80">E-mail</Label>
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
                <Label htmlFor="signup-password" className="text-white/80">Wachtwoord</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <SubmitButton className="w-full" pendingText="Bezig…">
                Account aanmaken
              </SubmitButton>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
