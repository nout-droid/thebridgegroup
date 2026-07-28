import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEquipmentPdf } from "@/lib/generate-equipment-pdf";
import { getOrgBranding } from "@/lib/server/organization";

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
    .select("id, name, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const branding = await getOrgBranding(project.user_id);

  const { data: items } = await supabase
    .from("equipment_reservations")
    .select("machine_type, quantity, accessories, reservation_date, duration, key_holder, supplier:suppliers(name)")
    .eq("project_id", id)
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

  const pdfBuffer = await generateEquipmentPdf(
    {
      projectName: project.name,
      generatedAt: new Date(),
      entries,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="materieel-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
