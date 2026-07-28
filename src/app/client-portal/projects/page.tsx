import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import type { ClientAccountProject } from "@/lib/types";
import { logoutClientAccount } from "../actions";

export default async function ClientPortalProjectsPage() {
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
