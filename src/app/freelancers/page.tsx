import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FreelancerSearch, type FreelancerRow } from "./freelancer-search";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const FREELANCERS_PAGE_LABELS = [
  "Freelancers",
  "Alle crew die ooit is toegevoegd, over al je projecten heen — doorzoekbaar op naam, functie of skill, zodat je snel iemand terugvindt die je eerder hebt ingezet.",
  "Zoek op naam, functie of skill…",
  "Naam",
  "Functie",
  "Project",
  "Geen resultaten.",
];

interface CrewRow {
  id: string;
  name: string;
  role: string;
  skills: string[];
  project: { id: string; name: string } | { id: string; name: string }[] | null;
}

export default async function FreelancersPage() {
  const supabase = await createClient();
  const [{ data: crew }, lang] = await Promise.all([
    supabase
      .from("crew_members")
      .select("id, name, role, skills, project:projects(id, name)")
      .neq("name", "")
      .order("name", { ascending: true })
      .returns<CrewRow[]>(),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, FREELANCERS_PAGE_LABELS);

  const rows: FreelancerRow[] = (crew ?? []).map((c) => {
    const project = Array.isArray(c.project) ? c.project[0] : c.project;
    return {
      id: c.id,
      name: c.name,
      role: c.role,
      skills: c.skills,
      projectId: project?.id ?? "",
      projectName: project?.name ?? "",
    };
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Freelancers")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Alle crew die ooit is toegevoegd, over al je projecten heen — doorzoekbaar op naam, functie of skill, zodat je snel iemand terugvindt die je eerder hebt ingezet."
              )}
            </p>
          </CardHeader>
          <CardContent>
            <FreelancerSearch
              rows={rows}
              labels={{
                placeholder: t("Zoek op naam, functie of skill…"),
                name: t("Naam"),
                role: t("Functie"),
                project: t("Project"),
                empty: t("Geen resultaten."),
              }}
            />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
