import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCardActions } from "./project-card-actions";
import { NEW_PROJECT_DIALOG_LABELS, PROJECT_CARD_ACTIONS_LABELS } from "./labels";
import type { Project } from "@/lib/types";
import { getTeamOwnerId } from "@/lib/server/team";
import { getOrgAccess } from "@/lib/server/subscription";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const PROJECTS_PAGE_LABELS = [
  "Naar Team & abonnement",
  "Projecten",
  "Nog geen projecten. Maak je eerste project aan om te beginnen met begroten.",
  "Klant:",
  "Datum:",
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: projects },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("projects").select("*").order("created_at", { ascending: false }).returns<Project[]>(),
  ]);

  const access = user ? await getOrgAccess(await getTeamOwnerId(supabase, user.id)) : null;
  const showAccessBanner = access && access.status !== "active" && access.status !== "no_org" && access.message;

  const lang = await getAppLang();
  const t = await createTranslator(lang, [
    ...PROJECTS_PAGE_LABELS,
    ...NEW_PROJECT_DIALOG_LABELS,
    ...PROJECT_CARD_ACTIONS_LABELS,
    ...(projects ?? []).map((p) => p.status),
  ]);

  const newProjectDialogLabels = {
    newProject: t("Nieuw project"),
    projectName: t("Projectnaam"),
    client: t("Klant"),
    eventDate: t("Event datum"),
    create: t("Aanmaken"),
  };

  const projectCardActionsLabels = {
    duplicate: t("Dupliceren"),
    remove: t("Verwijderen"),
    confirmDelete: t(
      "Dit project en alles daarin (offertes, draaiboek, crew, rider, ...) definitief verwijderen? Dit kan niet ongedaan worden gemaakt."
    ),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        {pageError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{pageError}</p>
        )}
        {showAccessBanner && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t(access.message ?? "")}{" "}
            <Link href="/team" className="font-medium underline">
              {t("Naar Team & abonnement")}
            </Link>
          </p>
        )}
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
            {t("Projecten")}
          </h1>
          <NewProjectDialog labels={newProjectDialogLabels} />
        </div>

        {!projects?.length ? (
          <p className="text-muted-foreground">
            {t("Nog geen projecten. Maak je eerste project aan om te beginnen met begroten.")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="h-full transition-colors hover:border-foreground/30">
                <Link href={`/projects/${project.id}`} className="block">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="secondary">{t(project.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {project.client_name && (
                      <p>
                        {t("Klant:")} {project.client_name}
                      </p>
                    )}
                    {project.event_date && (
                      <p>
                        {t("Datum:")} {project.event_date}
                      </p>
                    )}
                  </CardContent>
                </Link>
                <CardContent className="pt-0">
                  <ProjectCardActions projectId={project.id} labels={projectCardActionsLabels} />
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
