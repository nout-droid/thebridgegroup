import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound, getStageOrNotFound } from "@/lib/server/get-project";
import { ensureRiderWithDefaults, ensureStageRiderSections } from "@/lib/server/ensure-rider";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { RiderSection, RiderSectionItem } from "@/lib/types";
import { RiderReadOnly, RIDER_READONLY_LABELS } from "../../../rider-readonly";
import { RiderCard, RIDER_CARD_LABELS } from "../../../rider-card";
import { StageSubNav } from "../stage-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function StageRiderPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;
  const supabase = await createClient();

  // project/stage/riderId/lang hebben alleen `id`/`stageId` nodig (geen onderlinge
  // afhankelijkheid) — parallel opvragen i.p.v. na elkaar.
  const [project, stage, riderId, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    getStageOrNotFound(supabase, id, stageId),
    ensureRiderWithDefaults(supabase, id),
    getAppLang(),
  ]);
  if (riderId) {
    await ensureStageRiderSections(supabase, riderId, stageId);
  }

  const { data: allSections } = riderId
    ? await supabase
        .from("rider_sections")
        .select("*")
        .eq("rider_id", riderId)
        .order("sort_order", { ascending: true })
        .returns<RiderSection[]>()
    : { data: [] as RiderSection[] };

  const [{ data: riderSectionItems }, { data: riderSectionAttachments }] = allSections?.length
    ? await Promise.all([
        supabase
          .from("rider_section_items")
          .select("*")
          .in(
            "section_id",
            allSections.map((s) => s.id)
          )
          .order("sort_order", { ascending: true })
          .returns<RiderSectionItem[]>(),
        supabase
          .from("rider_section_attachments")
          .select("*")
          .in(
            "section_id",
            allSections.map((s) => s.id)
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

  const sectionsWithItems = (allSections ?? []).map((section) => ({
    ...section,
    items: (riderSectionItems ?? []).filter((item) => item.section_id === section.id),
    attachments: attachmentsWithUrl.filter((a) => a.section_id === section.id),
  }));

  const projectWideSections = sectionsWithItems.filter((s) => !s.stage_id);
  const stageSections = sectionsWithItems.filter((s) => s.stage_id === stageId);

  const t = await createTranslator(lang, [
    `Rider — ${stage.name}`,
    "Projectbrede onderdelen (alleen-lezen, wijzig via Rider in het hoofdmenu)",
    ...RIDER_CARD_LABELS,
    ...RIDER_READONLY_LABELS,
    ...projectWideSections.flatMap((s) => [
      s.title,
      s.content,
      ...(s.items ?? []).map((i) => i.description),
    ]),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <StageSubNav
        projectId={project.id}
        stageId={stage.id}
        stageName={`${project.name} — ${stage.name}`}
        active="rider"
      />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <RiderCard
          projectId={project.id}
          stageId={stage.id}
          riderId={riderId ?? null}
          sections={stageSections}
          title={`Rider — ${stage.name}`}
          showDownloadLinks={false}
          t={t}
        />

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Projectbrede onderdelen (alleen-lezen, wijzig via Rider in het hoofdmenu)")}
          </h2>
          <RiderReadOnly sections={projectWideSections} t={t} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
