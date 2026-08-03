import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { getTeamOwnerId } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CrewMember, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../project-sub-nav";
import { ProductionSubNav } from "./production-sub-nav";
import { CrewCard, CREW_CARD_LABELS } from "./crew-card";
import type { FreelancerOption } from "./freelancer-picker";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionCrewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerId = user ? await getTeamOwnerId(supabase, user.id) : null;

  // Deze queries hebben geen onderlinge afhankelijkheid — parallel opvragen i.p.v. na
  // elkaar.
  const [project, { data: members }, { data: suppliers }, { data: freelancers }, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("crew_members")
      .select("*, supplier:suppliers(*)")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<CrewMember[]>(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    ownerId
      ? supabase
          .from("freelancers")
          .select("id, name, role, home_address, day_rate, overtime_rate, km_rate")
          .eq("user_id", ownerId)
          .order("name", { ascending: true })
          .returns<FreelancerOption[]>()
      : Promise.resolve({ data: [] as FreelancerOption[] }),
    getAppLang(),
  ]);

  const t = await createTranslator(lang, [
    ...CREW_CARD_LABELS,
    ...(freelancers ?? []).map((f) => f.name),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="crew" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <CrewCard
          projectId={project.id}
          members={members ?? []}
          suppliers={suppliers ?? []}
          freelancers={freelancers ?? []}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
