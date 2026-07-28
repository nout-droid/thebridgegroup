import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCommsPdf } from "@/lib/generate-comms-pdf";
import { getOrgBranding } from "@/lib/server/organization";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, name, user_id")
    .eq("share_token", token)
    .maybeSingle();
  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const branding = await getOrgBranding(project.user_id);

  const { data: assignments } = await admin
    .from("comms_assignments")
    .select("kind, user_name, device_type, channels, supplier:suppliers(name), crew_member:crew_members(name)")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  const toEntry = (item: NonNullable<typeof assignments>[number]) => ({
    user_name: item.user_name,
    device_type: item.device_type,
    channels: item.channels,
    supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
    crew_member_name: (item.crew_member as unknown as { name: string } | null)?.name || null,
  });

  const intercom = (assignments ?? []).filter((a) => a.kind === "intercom").map(toEntry);
  const portofoon = (assignments ?? []).filter((a) => a.kind === "portofoon").map(toEntry);

  const pdfBuffer = await generateCommsPdf(
    {
      projectName: project.name,
      generatedAt: new Date(),
      intercom,
      portofoon,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comms-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
