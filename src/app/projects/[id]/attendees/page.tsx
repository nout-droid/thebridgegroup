import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { EventAttendee } from "@/lib/types";
import { AttendeeListCard, ATTENDEE_LIST_CARD_LABELS } from "../attendee-list-card";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProjectAttendeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, { data: attendees }, headersList, lang] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    supabase
      .from("event_attendees")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<EventAttendee[]>(),
    headers(),
    getAppLang(),
  ]);

  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const attendeeUrl = `${protocol}://${host}/attendee/${project.share_token}`;

  const t = await createTranslator(lang, [...ATTENDEE_LIST_CARD_LABELS]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="attendees" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <AttendeeListCard
          projectId={project.id}
          enabled={project.attendee_app_enabled}
          attendeeUrl={attendeeUrl}
          attendees={attendees ?? []}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
