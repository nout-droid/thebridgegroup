import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

interface BadgeMemberRow {
  name: string;
  role: string;
  accredited: boolean;
  needs_catering: boolean;
  needs_hotel: boolean;
  project_id: string;
  access_dates: string[];
  crew_position: { stage: { name: string } | null } | null;
}

function todayIso() {
  // Datum op basis van de serverklok op het moment van scannen — dus altijd de
  // dag waarop de deur daadwerkelijk gecontroleerd wordt, niet wanneer de badge
  // is aangemaakt.
  return new Date().toISOString().slice(0, 10);
}

export default async function BadgeScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("crew_members")
    .select(
      "name, role, accredited, needs_catering, needs_hotel, project_id, access_dates, crew_position:crew_positions(stage:stages(name))"
    )
    .eq("badge_token", token)
    .maybeSingle<BadgeMemberRow>();

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-700 p-6">
        <p className="text-lg font-semibold text-white">Badge niet gevonden of ongeldig</p>
      </div>
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("name")
    .eq("id", member.project_id)
    .maybeSingle();

  const areaName = member.crew_position?.stage?.name ?? "Alle areas";
  const accessDates = member.access_dates ?? [];
  const hasDateRestriction = accessDates.length > 0;
  const today = todayIso();
  const allowedToday = !hasDateRestriction || accessDates.includes(today);
  const accessGranted = member.accredited && allowedToday;

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-white ${
        accessGranted ? "bg-black" : "bg-red-700"
      }`}
    >
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-[#7dff43]">The Bridge AV Group</p>
        <p className="mt-1 text-xs text-white/60">{project?.name}</p>
      </div>

      {!accessGranted && (
        <div className="rounded-md bg-white px-6 py-3 text-center">
          <p className="text-xl font-bold text-red-700">TOEGANG GEWEIGERD</p>
          <p className="text-sm text-red-700">
            {!member.accredited
              ? "Nog niet geaccrediteerd"
              : `Geen toegang op ${today} — toegestane data: ${accessDates.join(", ")}`}
          </p>
        </div>
      )}

      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 text-black">
        <div>
          <p className="text-2xl font-bold">{member.name || "Naam onbekend"}</p>
          <p className="text-sm text-muted-foreground">{member.role || "—"}</p>
        </div>

        <div className={`rounded-md p-3 text-center font-semibold ${member.accredited ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {member.accredited ? "Geaccrediteerd" : "Nog niet geaccrediteerd"}
        </div>

        <div className={`rounded-md p-3 text-center font-semibold ${allowedToday ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          Toegang vandaag ({today}): {allowedToday ? "Ja" : "Nee"}
        </div>

        <div className="rounded-md bg-muted p-3 text-center text-sm">
          <p className="font-semibold">Area: {areaName}</p>
          {hasDateRestriction && (
            <p className="mt-1 text-xs text-muted-foreground">
              Toegangsdata: {accessDates.join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-md p-3 text-center font-semibold ${member.needs_catering ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            Catering: {member.needs_catering ? "Ja" : "Nee"}
          </div>
          <div className={`rounded-md p-3 text-center font-semibold ${member.needs_hotel ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            Hotel: {member.needs_hotel ? "Ja" : "Nee"}
          </div>
        </div>
      </div>
    </div>
  );
}
