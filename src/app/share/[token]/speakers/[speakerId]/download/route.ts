import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";

// Zelfde patroon als crew/[token]/speakers/[speakerId]/download/route.ts: eerst het share_token
// verifiëren, dan pas tekenen. De client-portal-cookie/klantaccount bewaakt alleen de pagina,
// niet deze route — vandaar de expliciete project_id-cross-check via de speaker zelf.
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
