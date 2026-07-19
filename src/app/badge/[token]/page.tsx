import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("name, role, accredited, needs_catering, needs_hotel, project_id")
    .eq("badge_token", token)
    .maybeSingle();

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <p className="text-lg font-semibold text-white">Badge niet gevonden</p>
      </div>
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("name")
    .eq("id", member.project_id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black p-6 text-white">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-[#7dff43]">The Bridge AV Group</p>
        <p className="mt-1 text-xs text-white/60">{project?.name}</p>
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 text-black">
        <div>
          <p className="text-2xl font-bold">{member.name || "Naam onbekend"}</p>
          <p className="text-sm text-muted-foreground">{member.role || "—"}</p>
        </div>

        <div className={`rounded-md p-3 text-center font-semibold ${member.accredited ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {member.accredited ? "Geaccrediteerd" : "Nog niet geaccrediteerd"}
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
