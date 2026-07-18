import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { ensureRiderWithDefaults } from "@/lib/server/ensure-rider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { RiderSection, RiderSectionItem } from "@/lib/types";
import { RiderCard } from "../rider-card";
import { ProjectSubNav } from "../project-sub-nav";

export default async function ProjectRiderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const riderId = await ensureRiderWithDefaults(supabase, id);

  const { data: riderSections } = riderId
    ? await supabase
        .from("rider_sections")
        .select("*")
        .eq("rider_id", riderId)
        .order("sort_order", { ascending: true })
        .returns<RiderSection[]>()
    : { data: [] as RiderSection[] };

  const { data: riderSectionItems } = riderSections?.length
    ? await supabase
        .from("rider_section_items")
        .select("*")
        .in(
          "section_id",
          riderSections.map((s) => s.id)
        )
        .order("sort_order", { ascending: true })
        .returns<RiderSectionItem[]>()
    : { data: [] as RiderSectionItem[] };

  const riderSectionsWithItems = (riderSections ?? []).map((section) => ({
    ...section,
    items: (riderSectionItems ?? []).filter((item) => item.section_id === section.id),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="rider" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <RiderCard
          projectId={project.id}
          riderId={riderId ?? null}
          sections={riderSectionsWithItems}
        />
      </main>
      <Footer />
    </div>
  );
}
