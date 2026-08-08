import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { type GuestRsvpStatus, type GuestType } from "@/lib/types";
import { getOrganizationName } from "@/lib/server/organization";
import { checkInEventGuest, checkOutEventGuest } from "./actions";
import { GuestBadgeView } from "./guest-badge-view";

interface GuestBadgeRow {
  name: string;
  guest_type: GuestType | string;
  rsvp_status: GuestRsvpStatus | string;
  plus_ones: number;
  project_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

export default async function GuestBadgeScanPage({
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
    .select("name, guest_type, rsvp_status, plus_ones, project_id, checked_in_at, checked_out_at")
    .eq("badge_token", token)
    .maybeSingle<GuestBadgeRow>();

  if (!guest) {
    return (
      <GuestBadgeView
        guest={null}
        orgName="The Bridge Group B.V."
        projectName={undefined}
        checkInAction={checkInEventGuest.bind(null, token)}
        checkOutAction={checkOutEventGuest.bind(null, token)}
      />
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("name, user_id")
    .eq("id", guest.project_id)
    .maybeSingle();

  const orgName = project ? await getOrganizationName(project.user_id) : "The Bridge Group B.V.";

  return (
    <GuestBadgeView
      guest={guest}
      orgName={orgName}
      projectName={project?.name}
      checkInAction={checkInEventGuest.bind(null, token)}
      checkOutAction={checkOutEventGuest.bind(null, token)}
    />
  );
}
