import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePowerPdf } from "@/lib/generate-power-pdf";

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

  const { data: items } = await supabase
    .from("power_requests")
    .select("description, quantity, position, notes, supplier:suppliers(name), stage:stages(name)")
    .eq("project_id", id)
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
