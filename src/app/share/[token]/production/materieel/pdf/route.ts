import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateEquipmentPdf } from "@/lib/generate-equipment-pdf";

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
    .from("equipment_reservations")
    .select("machine_type, quantity, accessories, reservation_date, duration, key_holder, supplier:suppliers(name)")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  const entries = (items ?? []).map((item) => ({
    machine_type: item.machine_type,
    quantity: item.quantity,
    accessories: item.accessories,
    reservation_date: item.reservation_date,
    duration: item.duration,
    key_holder: item.key_holder,
    supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
  }));

  const pdfBuffer = await generateEquipmentPdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="materieel-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
