import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getOrganizationName } from "@/lib/server/organization";
import { Footer } from "@/components/footer";
import { AttendeeLogin } from "./attendee-login";
import { AttendeeView } from "./attendee-view";
import { registerAttendee, loginAttendee } from "./actions";

export default async function AttendeePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, name, event_date, user_id, attendee_app_enabled")
    .eq("share_token", token)
    .maybeSingle();

  if (!project || !project.attendee_app_enabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-black px-6 text-center text-white">
        <p className="text-lg font-semibold">Deze event app is niet beschikbaar.</p>
        <p className="text-sm text-white/60">Vraag de organisator naar de juiste link.</p>
        <Footer variant="dark" />
      </div>
    );
  }

  const orgName = await getOrganizationName(project.user_id);

  const cookieStore = await cookies();
  const attendeeId = cookieStore.get(`attendee_id_${token}`)?.value;

  let verifiedAttendeeId: string | null = null;
  if (attendeeId) {
    const { data: attendee } = await admin
      .from("event_attendees")
      .select("id")
      .eq("id", attendeeId)
      .eq("project_id", project.id)
      .maybeSingle();
    verifiedAttendeeId = attendee?.id ?? null;
  }

  if (verifiedAttendeeId) {
    return <AttendeeView token={token} attendeeId={verifiedAttendeeId} organizationName={orgName} />;
  }

  return (
    <AttendeeLogin
      token={token}
      organizationName={orgName}
      projectName={project.name}
      registerAction={registerAttendee.bind(null, token)}
      loginAction={loginAttendee.bind(null, token)}
    />
  );
}
