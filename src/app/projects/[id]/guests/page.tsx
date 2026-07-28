import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { EventGuest, GuestDocument } from "@/lib/types";
import { GuestDocumentsCard, GUEST_DOCUMENTS_CARD_LABELS } from "../guest-documents-card";
import { GuestListCard, GUEST_LIST_CARD_LABELS } from "../guest-list-card";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProjectGuestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Geen van deze heeft elkaars resultaat nodig — alleen `id` — dus in één keer
  // parallel opvragen i.p.v. 5 losse round-trips na elkaar.
  const [project, { data: guestDocuments }, { data: guests }, headersList, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("guest_documents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<GuestDocument[]>(),
    supabase
      .from("event_guests")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<EventGuest[]>(),
    headers(),
    getAppLang(),
  ]);

  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const t = await createTranslator(lang, [...GUEST_LIST_CARD_LABELS, ...GUEST_DOCUMENTS_CARD_LABELS]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="guests" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <GuestListCard projectId={project.id} guests={guests ?? []} baseUrl={baseUrl} t={t} />
        <GuestDocumentsCard project={project} documents={guestDocuments ?? []} t={t} />
      </main>
      <Footer />
    </div>
  );
}
