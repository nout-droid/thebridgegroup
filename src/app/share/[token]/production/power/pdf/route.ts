import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePowerPdf } from "@/lib/generate-power-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, name")
    .eq("share_token", token)
    .maybeSingle();
  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const { data: items } = await admin
    .from("power_requests")
    .select("description, quantity, position, notes, supplier:suppliers(name), stage:stages(name)")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  const entries = (items ?? []).map((item) => ({
    description: item.description,
    quantity: item.quantity,
    position: item.position,
    notes: item.notes,
    supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
    stage_name: (item.stage as unknown as { name: string } | null)?.name ?? null,
  }));

  const pdfBuffer = await generatePowerPdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="stroom-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
