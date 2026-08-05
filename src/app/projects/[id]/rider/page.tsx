import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { ensureRiderWithDefaults } from "@/lib/server/ensure-rider";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { RiderSection, RiderSectionItem } from "@/lib/types";
import { RiderCard, RIDER_CARD_LABELS } from "../rider-card";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProjectRiderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // project/riderId/lang hebben alleen `id` nodig (geen onderlinge afhankelijkheid) —
  // parallel opvragen i.p.v. na elkaar.
  const [project, riderId, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    ensureRiderWithDefaults(supabase, id),
    getAppLang(),
  ]);

  const { data: riderSections } = riderId
    ? await supabase
        .from("rider_sections")
        .select("*")
        .eq("rider_id", riderId)
        .is("stage_id", null)
        .order("sort_order", { ascending: true })
        .returns<RiderSection[]>()
    : { data: [] as RiderSection[] };

  const [{ data: riderSectionItems }, { data: riderSectionAttachments }] = riderSections?.length
    ? await Promise.all([
        supabase
          .from("rider_section_items")
          .select("*")
          .in(
            "section_id",
            riderSections.map((s) => s.id)
          )
          .order("sort_order", { ascending: true })
          .returns<RiderSectionItem[]>(),
        supabase
          .from("rider_section_attachments")
          .select("*")
          .in(
            "section_id",
            riderSections.map((s) => s.id)
          )
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [] as RiderSectionItem[] }, { data: [] as { id: string; section_id: string; storage_path: string; original_filename: string; uploaded_by: "owner" | "client"; created_at: string }[] }];

  const attachmentsWithUrl = await Promise.all(
    (riderSectionAttachments ?? []).map(async (attachment) => ({
      id: attachment.id,
      section_id: attachment.section_id,
      original_filename: attachment.original_filename,
      uploaded_by: attachment.uploaded_by,
      created_at: attachment.created_at,
      url: await getSignedPortalUrl(attachment.storage_path),
    }))
  );

  const riderSectionsWithItems = (riderSections ?? []).map((section) => ({
    ...section,
    items: (riderSectionItems ?? []).filter((item) => item.section_id === section.id),
    attachments: attachmentsWithUrl.filter((a) => a.section_id === section.id),
  }));

  const t = await createTranslator(lang, ["Rider (projectbreed)", ...RIDER_CARD_LABELS]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="rider" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <RiderCard
          projectId={project.id}
          stageId={null}
          riderId={riderId ?? null}
          sections={riderSectionsWithItems}
          title="Rider (projectbreed)"
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
