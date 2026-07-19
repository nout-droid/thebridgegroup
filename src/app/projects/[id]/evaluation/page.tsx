import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { ensureEvaluation } from "@/lib/server/ensure-evaluation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveEvaluation } from "../evaluation-actions";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const evaluationId = await ensureEvaluation(supabase, id);

  const { data: evaluation } = evaluationId
    ? await supabase
        .from("project_evaluations")
        .select("content, updated_at")
        .eq("id", evaluationId)
        .maybeSingle<{ content: string; updated_at: string }>()
    : { data: null };

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="evaluation" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluatie</CardTitle>
            <p className="text-sm text-muted-foreground">
              Wat ging goed, wat kan beter, actiepunten voor volgende keer — vrije notitie,
              blijft bij het project staan.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={saveEvaluation.bind(null, project.id)} className="space-y-3">
              <Textarea name="content" defaultValue={evaluation?.content ?? ""} rows={16} />
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm">
                  Opslaan
                </Button>
                {evaluation?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Laatst bijgewerkt:{" "}
                    {new Date(evaluation.updated_at).toLocaleString("nl-NL")}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
