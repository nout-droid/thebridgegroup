import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Zelfde privacy-lijn als get_attendee_saved_contacts: nooit e-mail, alleen wat de attendee
// zelf al in de "Opgeslagen"-tab ziet — dit is puur een download van diezelfde data.
function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const cookieStore = await cookies();
  const attendeeId = cookieStore.get(`attendee_id_${token}`)?.value;
  if (!attendeeId) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: attendee } = await admin
    .from("event_attendees")
    .select("id, projects!inner(share_token)")
    .eq("id", attendeeId)
    .maybeSingle<{ id: string; projects: { share_token: string } }>();

  if (!attendee || attendee.projects.share_token !== token) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const { data: saved } = await admin
    .from("event_attendee_saved_contacts")
    .select("created_at, contact:event_attendees!event_attendee_saved_contacts_saved_attendee_id_fkey(name, company, title)")
    .eq("attendee_id", attendeeId)
    .order("created_at", { ascending: false })
    .returns<{ created_at: string; contact: { name: string; company: string | null; title: string | null } }[]>();

  const rows = [
    ["Naam", "Bedrijf", "Functie", "Bewaard op"],
    ...(saved ?? []).map((row) => [
      row.contact.name,
      row.contact.company ?? "",
      row.contact.title ?? "",
      new Date(row.created_at).toISOString().slice(0, 10),
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacten-${token.slice(0, 8)}.csv"`,
    },
  });
}
