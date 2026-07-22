import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCardActions } from "./project-card-actions";
import type { Project } from "@/lib/types";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Project[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        {pageError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{pageError}</p>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projecten</h1>
          <NewProjectDialog />
        </div>

        {!projects?.length ? (
          <p className="text-muted-foreground">
            Nog geen projecten. Maak je eerste project aan om te beginnen met begroten.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="h-full transition-colors hover:border-foreground/30">
                <Link href={`/projects/${project.id}`} className="block">
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
                </Link>
                <CardContent className="pt-0">
                  <ProjectCardActions projectId={project.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
