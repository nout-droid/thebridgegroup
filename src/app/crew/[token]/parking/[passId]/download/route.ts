import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";

// Zelfde beveiligingsniveau als get_shared_rundowns zelf (alleen het token, geen extra cookie —
// de crew-cookie bewaakt alleen de pagina-route, niet de onderliggende RPC/data): eerst het
// share_token verifiëren, dan pas tekenen. Net als
// crew/[token]/speakers/[speakerId]/download/route.ts.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; passId: string }> }
) {
  const { token, passId } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (!project) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: pass } = await admin
    .from("parking_passes")
    .select("storage_path, project_id, visible_to_crew")
    .eq("id", passId)
    .maybeSingle();
  if (!pass || pass.project_id !== project.id || !pass.visible_to_crew) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const url = await getSignedPortalUrl(pass.storage_path);
  if (!url) return new NextResponse("Niet gevonden", { status: 404 });

  return NextResponse.redirect(url);
}
