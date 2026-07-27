import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_RSVP_STATUS_LABELS, GUEST_TYPE_LABELS, type GuestRsvpStatus, type GuestType } from "@/lib/types";
import { checkInEventGuest } from "./actions";

interface GuestBadgeRow {
  name: string;
  guest_type: GuestType | string;
  rsvp_status: GuestRsvpStatus | string;
  plus_ones: number;
  project_id: string;
  checked_in_at: string | null;
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
    .select("name, guest_type, rsvp_status, plus_ones, project_id, checked_in_at")
    .eq("badge_token", token)
    .maybeSingle<GuestBadgeRow>();

  if (!guest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-700 p-6">
        <p className="text-lg font-semibold text-white">Badge niet gevonden of ongeldig</p>
      </div>
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("name")
    .eq("id", guest.project_id)
    .maybeSingle();

  const declined = guest.rsvp_status === "afgemeld";
  const typeLabel = GUEST_TYPE_LABELS[guest.guest_type as GuestType] ?? guest.guest_type;
  const rsvpLabel = GUEST_RSVP_STATUS_LABELS[guest.rsvp_status as GuestRsvpStatus] ?? guest.rsvp_status;

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-white ${
        declined ? "bg-red-700" : "bg-black"
      }`}
    >
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-[#7dff43]">The Bridge AV Group</p>
        <p className="mt-1 text-xs text-white/60">{project?.name}</p>
      </div>

      {declined && (
        <div className="rounded-md bg-white px-6 py-3 text-center">
          <p className="text-xl font-bold text-red-700">AFGEMELD</p>
        </div>
      )}

      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 text-black">
        <div>
          <p className="text-2xl font-bold">{guest.name || "Naam onbekend"}</p>
          <p className="text-sm text-muted-foreground">
            {typeLabel}
            {guest.plus_ones > 0 && ` · +${guest.plus_ones}`}
          </p>
        </div>

        <div
          className={`rounded-md p-3 text-center font-semibold ${
            declined ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          RSVP: {rsvpLabel}
        </div>

        {!declined && (
          <div className="border-t pt-3">
            {guest.checked_in_at ? (
              <p className="rounded-md bg-green-100 p-3 text-center font-semibold text-green-800">
                Ingecheckt om{" "}
                {new Date(guest.checked_in_at).toLocaleTimeString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <form action={checkInEventGuest.bind(null, token)}>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground"
                >
                  Inchecken
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
