import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCommsPdf } from "@/lib/generate-comms-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: assignments } = await supabase
    .from("comms_assignments")
    .select("kind, user_name, device_type, channels, supplier:suppliers(name), crew_member:crew_members(name)")
    .eq("project_id", id)
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

  const pdfBuffer = await generateCommsPdf({
    projectName: project.name,
    generatedAt: new Date(),
    intercom,
    portofoon,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comms-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
