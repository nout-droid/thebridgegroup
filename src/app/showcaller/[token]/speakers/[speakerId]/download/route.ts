import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";

// Zelfde beveiligingsniveau als get_shared_rundowns zelf (alleen het token, geen extra cookie —
// de showcaller-cookie bewaakt alleen de pagina-route, niet de onderliggende RPC/data): eerst het
// share_token verifiëren, dan pas tekenen. Net als share/[token]/intake-photos/[photoId]/route.ts.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; speakerId: string }> }
) {
  const { token, speakerId } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (!project) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: speaker } = await admin
    .from("speakers")
    .select("presentation_url, project_id")
    .eq("id", speakerId)
    .maybeSingle();
  if (!speaker || speaker.project_id !== project.id || !speaker.presentation_url) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const url = await getSignedPortalUrl(speaker.presentation_url);
  if (!url) return new NextResponse("Niet gevonden", { status: 404 });

  return NextResponse.redirect(url);
}
