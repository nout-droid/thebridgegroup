import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/footer";
import type { ClientAccountProject } from "@/lib/types";
import { logoutClientAccount } from "../actions";
import { requestClientProject } from "./request-actions";

export default async function ClientPortalProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ requestError?: string; requested?: string }>;
}) {
  const { requestError, requested } = await searchParams;

  const cookieStore = await cookies();
  const accountId = cookieStore.get("client_account_id")?.value;

  if (!accountId) {
    redirect("/client-portal");
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_client_account_projects", { p_account_id: accountId });
  const projects = (data ?? []) as ClientAccountProject[];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-2 bg-black px-6 py-3 text-primary">
        <div className="flex items-center gap-2 font-heading text-base font-extrabold tracking-tight">
          <Image src="/logo.png" alt="The Bridge Group B.V." width={28} height={21} />
          The Bridge Group B.V.
        </div>
        <form action={logoutClientAccount}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Uitloggen
          </Button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          Jouw projecten
        </h1>

        {requested && (
          <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">
            Je aanvraag is ontvangen — het nieuwe project staat hieronder klaar.
          </p>
        )}
        {requestError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{requestError}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nieuw project aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={requestClientProject} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Naam van het event</Label>
                <Input id="name" name="name" required autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event_date">Event datum</Label>
                <Input id="event_date" name="event_date" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Toelichting (optioneel)</Label>
                <Textarea id="description" name="description" rows={3} placeholder="Wat wil je aanvragen?" />
              </div>
              <Button type="submit">Aanvragen</Button>
            </form>
          </CardContent>
        </Card>

        {!projects.length ? (
          <p className="text-muted-foreground">
            Er zijn nog geen projecten aan dit account gekoppeld.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/share/${project.share_token}`}>
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {project.client_name && <p>Klant: {project.client_name}</p>}
                    {project.event_date && <p>Datum: {project.event_date}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
