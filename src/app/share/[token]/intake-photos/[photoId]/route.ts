import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";

// De klant heeft geen sessie, dus signed URLs kunnen niet al bij page-load worden
// meegestuurd (share-view.tsx is een client component dat nieuwe foto's via polling
// binnenkrijgt) — deze route verifieert het share_token en tekent dan pas.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  const { token, photoId } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (!project) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: photo } = await admin
    .from("intake_checklist_photos")
    .select("storage_path, checklist_id")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: checklist } = await admin
    .from("intake_checklists")
    .select("project_id")
    .eq("id", photo.checklist_id)
    .maybeSingle();
  if (!checklist || checklist.project_id !== project.id) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const url = await getSignedPortalUrl(photo.storage_path);
  if (!url) return new NextResponse("Niet gevonden", { status: 404 });

  return NextResponse.redirect(url);
}
