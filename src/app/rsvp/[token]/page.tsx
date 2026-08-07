import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationName } from "@/lib/server/organization";
import { submitRsvp } from "./actions";

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
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <p className="text-lg font-semibold text-white">Uitnodiging niet gevonden of ongeldig</p>
      </div>
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("name, event_date, user_id")
    .eq("id", guest.project_id)
    .maybeSingle();

  const orgName = project ? await getOrganizationName(project.user_id) : "The Bridge Group B.V.";
  const responded = Boolean(guest.responded_at);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black p-6 text-white">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-[#7dff43]">{orgName}</p>
        <p className="mt-1 text-xl font-bold">{project?.name}</p>
        {project?.event_date && <p className="text-sm text-white/60">{project.event_date}</p>}
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 text-black">
        <p className="text-lg font-semibold">Hoi {guest.name || "daar"},</p>

        {responded ? (
          <div className="space-y-3">
            <div
              className={`rounded-md p-3 text-center font-semibold ${
                guest.rsvp_status === "afgemeld" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}
            >
              Jouw reactie: {guest.rsvp_status === "afgemeld" ? "Afgemeld" : "Bevestigd"}
            </div>
            <p className="text-xs text-muted-foreground">
              Reactie wijzigen kan hieronder nog steeds.
            </p>
            <RsvpForm token={token} guest={guest} />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Ben je erbij?</p>
            <RsvpForm token={token} guest={guest} />
          </>
        )}
      </div>
    </div>
  );
}

function RsvpForm({ token, guest }: { token: string; guest: RsvpGuestRow }) {
  return (
    <form action={submitRsvp.bind(null, token)} className="space-y-3">
      {guest.plus_ones > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Naam introducee(s)</label>
          <input
            type="text"
            name="plus_one_name"
            defaultValue={guest.plus_one_name}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Dieetwensen / allergieën (optioneel)
        </label>
        <textarea
          name="dietary_notes"
          defaultValue={guest.dietary_notes}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          name="status"
          value="bevestigd"
          className="flex-1 rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground"
        >
          Ik kom
        </button>
        <button
          type="submit"
          name="status"
          value="afgemeld"
          className="flex-1 rounded-md border border-red-600 py-3 text-center font-semibold text-red-600"
        >
          Ik kan niet
        </button>
      </div>
    </form>
  );
}
