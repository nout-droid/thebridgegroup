import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationName } from "@/lib/server/organization";
import { submitRsvp } from "./actions";
import { RsvpView } from "./rsvp-view";

interface RsvpGuestRow {
  name: string;
  plus_ones: number;
  plus_one_name: string;
  dietary_notes: string;
  rsvp_status: string;
  responded_at: string | null;
  project_id: string;
}

export default async function GuestRsvpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("event_guests")
    .select("name, plus_ones, plus_one_name, dietary_notes, rsvp_status, responded_at, project_id")
    .eq("invite_token", token)
    .maybeSingle<RsvpGuestRow>();

  if (!guest) {
    return (
      <RsvpView
        guest={null}
        orgName="The Bridge Group B.V."
        projectName={undefined}
        eventDate={null}
        token={token}
        submitAction={submitRsvp.bind(null, token)}
      />
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("name, event_date, user_id")
    .eq("id", guest.project_id)
    .maybeSingle();

  const orgName = project ? await getOrganizationName(project.user_id) : "The Bridge Group B.V.";

  return (
    <RsvpView
      guest={guest}
      orgName={orgName}
      projectName={project?.name}
      eventDate={project?.event_date}
      token={token}
      submitAction={submitRsvp.bind(null, token)}
    />
  );
}
