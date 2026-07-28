import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { ensureIntakeChecklist } from "@/lib/server/ensure-intake-checklist";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { IntakeChecklistAnswer } from "@/lib/types";
import {
  IntakeChecklistCard,
  INTAKE_CHECKLIST_CARD_LABELS,
  type IntakeChecklistPhotoWithUrl,
} from "../intake-checklist-card";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProjectIntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // project/checklistId/lang hebben alleen `id` nodig (geen onderlinge afhankelijkheid)
  // — parallel opvragen i.p.v. na elkaar.
  const [project, checklistId, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    ensureIntakeChecklist(supabase, id),
    getAppLang(),
  ]);

  // `answers` en `photoRows` hangen alleen van `checklistId` af, niet van elkaar —
  // parallel opvragen i.p.v. na elkaar.
  const [{ data: answers }, { data: photoRows }] = checklistId
    ? await Promise.all([
        supabase
          .from("intake_checklist_answers")
          .select("*")
          .eq("checklist_id", checklistId)
          .returns<IntakeChecklistAnswer[]>(),
        supabase
          .from("intake_checklist_photos")
          .select("*")
          .eq("checklist_id", checklistId)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [] as IntakeChecklistAnswer[] }, { data: [] }];

  const photos: IntakeChecklistPhotoWithUrl[] = await Promise.all(
    (photoRows ?? []).map(async (photo) => ({
      id: photo.id,
      section_key: photo.section_key,
      original_filename: photo.original_filename,
      uploaded_by: photo.uploaded_by,
      url: await getSignedPortalUrl(photo.storage_path),
    }))
  );

  const t = await createTranslator(lang, INTAKE_CHECKLIST_CARD_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="intake" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <IntakeChecklistCard
          projectId={project.id}
          answers={answers ?? []}
          photos={photos}
          lang={lang}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
