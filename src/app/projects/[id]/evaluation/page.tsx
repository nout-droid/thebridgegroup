import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { ensureEvaluation } from "@/lib/server/ensure-evaluation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveEvaluation } from "../evaluation-actions";
import { rateSupplier } from "../supplier-rating-actions";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const EVALUATION_PAGE_LABELS = [
  "Evaluatie",
  "Wat ging goed, wat kan beter, actiepunten voor volgende keer — vrije notitie, blijft bij het project staan.",
  "Opslaan",
  "Laatst bijgewerkt:",
  "Leveranciersbeoordeling",
  "Beoordeel de leveranciers die aan dit project hebben meegewerkt — helpt bij toekomstige boekingskeuzes.",
  "Nog geen leveranciers aan dit project gekoppeld.",
  "Cijfer",
  "Notitie (optioneel)",
];

export default async function ProjectEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze hebben geen onderlinge afhankelijkheid (allebei alleen `id` nodig) — parallel
  // opvragen i.p.v. na elkaar.
  const [project, evaluationId, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    ensureEvaluation(supabase, id),
    getAppLang(),
  ]);

  const { data: evaluation } = evaluationId
    ? await supabase
        .from("project_evaluations")
        .select("content, updated_at")
        .eq("id", evaluationId)
        .maybeSingle<{ content: string; updated_at: string }>()
    : { data: null };

  // Leveranciers die daadwerkelijk aan dit project gekoppeld zijn — via hun offertes op de
  // categorieën van dit project. Geen aparte project-suppliers-tabel, dus dedupen in JS.
  const { data: categories } = await supabase.from("categories").select("id").eq("project_id", id);
  const categoryIds = (categories ?? []).map((c) => c.id);

  const { data: quotesForSuppliers } = categoryIds.length
    ? await supabase
        .from("quotes")
        .select("supplier_id, supplier:suppliers(id, name)")
        .in("category_id", categoryIds)
    : { data: [] as { supplier_id: string; supplier: { id: string; name: string } | { id: string; name: string }[] | null }[] };

  const supplierMap = new Map<string, string>();
  for (const q of quotesForSuppliers ?? []) {
    const supplier = Array.isArray(q.supplier) ? q.supplier[0] : q.supplier;
    if (supplier) supplierMap.set(supplier.id, supplier.name);
  }
  const involvedSuppliers = [...supplierMap.entries()]
    .map(([supplierId, name]) => ({ id: supplierId, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const { data: ratings } = involvedSuppliers.length
    ? await supabase
        .from("supplier_ratings")
        .select("supplier_id, rating, note")
        .eq("project_id", id)
        .in(
          "supplier_id",
          involvedSuppliers.map((s) => s.id)
        )
    : { data: [] as { supplier_id: string; rating: number; note: string }[] };
  const ratingMap = new Map((ratings ?? []).map((r) => [r.supplier_id, r]));

  const t = await createTranslator(lang, [
    ...EVALUATION_PAGE_LABELS,
    ...involvedSuppliers.map((s) => s.name),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="evaluation" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Evaluatie")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Wat ging goed, wat kan beter, actiepunten voor volgende keer — vrije notitie, blijft bij het project staan."
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={saveEvaluation.bind(null, project.id)} className="space-y-3">
              <Textarea name="content" defaultValue={evaluation?.content ?? ""} rows={16} />
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm">
                  {t("Opslaan")}
                </Button>
                {evaluation?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    {t("Laatst bijgewerkt:")}{" "}
                    {new Date(evaluation.updated_at).toLocaleString("nl-NL")}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Leveranciersbeoordeling")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Beoordeel de leveranciers die aan dit project hebben meegewerkt — helpt bij toekomstige boekingskeuzes."
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {!involvedSuppliers.length ? (
              <p className="text-sm text-muted-foreground">
                {t("Nog geen leveranciers aan dit project gekoppeld.")}
              </p>
            ) : (
              involvedSuppliers.map((supplier) => {
                const existing = ratingMap.get(supplier.id);
                return (
                  <form
                    key={supplier.id}
                    action={rateSupplier.bind(null, project.id, supplier.id)}
                    className="flex flex-wrap items-end gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-[160px] flex-1 space-y-1">
                      <p className="text-sm font-medium">{t(supplier.name)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("Cijfer")}</label>
                      <Select name="rating" defaultValue={existing?.rating ? String(existing.rating) : "5"}>
                        <SelectTrigger className="h-9 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[200px] flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">{t("Notitie (optioneel)")}</label>
                      <Input name="note" defaultValue={existing?.note ?? ""} className="h-9" />
                    </div>
                    <Button type="submit" size="sm" variant="secondary">
                      {t("Opslaan")}
                    </Button>
                  </form>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
