import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/server/origin";
import { generateBadgePdf } from "@/lib/generate-badge-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Niet ingelogd", { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const { data: member } = await supabase
    .from("crew_members")
    .select("name, role, badge_token")
    .eq("id", memberId)
    .eq("project_id", id)
    .maybeSingle();
  if (!member) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const origin = await getOrigin();
  const pdfBuffer = await generateBadgePdf({
    projectName: project.name,
    entries: [{ name: member.name, role: member.role, badgeUrl: `${origin}/badge/${member.badge_token}` }],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="badge-${(member.name || "crew").replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
