import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";

// Zelfde patroon als intake-photos/[photoId]/route.ts: de klant heeft geen sessie, dus
// signed URLs worden pas op download-moment getekend na verificatie van het share_token.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; attachmentId: string }> }
) {
  const { token, attachmentId } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (!project) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: attachment } = await admin
    .from("rider_section_attachments")
    .select("storage_path, section_id")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!attachment) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: section } = await admin
    .from("rider_sections")
    .select("rider_id")
    .eq("id", attachment.section_id)
    .maybeSingle();
  if (!section) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: rider } = await admin
    .from("riders")
    .select("project_id")
    .eq("id", section.rider_id)
    .maybeSingle();
  if (!rider || rider.project_id !== project.id) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const url = await getSignedPortalUrl(attachment.storage_path);
  if (!url) return new NextResponse("Niet gevonden", { status: 404 });

  return NextResponse.redirect(url);
}
