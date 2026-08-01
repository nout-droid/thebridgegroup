import { cookies, headers } from "next/headers";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Genereert de QR-afbeelding van de INGELOGDE attendee zelf, op basis van de attendee_id_
// <token>-cookie (zelfde autorisatiepatroon als isAuthorizedAttendee in ../actions.ts) — de
// qr_token zelf verlaat de server dus nooit als los, herbruikbaar stukje data, alleen als
// afbeelding die naar https://<host>/attendee-connect/<qr_token> wijst.
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
    .select("id, qr_token, projects!inner(share_token)")
    .eq("id", attendeeId)
    .maybeSingle<{ id: string; qr_token: string; projects: { share_token: string } }>();

  if (!attendee || attendee.projects.share_token !== token) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const connectUrl = `${protocol}://${host}/attendee-connect/${attendee.qr_token}`;

  const qrBuffer = await QRCode.toBuffer(connectUrl, { margin: 1, width: 320 });

  return new NextResponse(new Uint8Array(qrBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}
