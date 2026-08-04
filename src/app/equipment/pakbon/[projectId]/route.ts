import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePakbonPdf } from "@/lib/generate-pakbon-pdf";
import { getOrgBranding } from "@/lib/server/organization";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
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
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const branding = await getOrgBranding(project.user_id);

  const { data: bookings } = await supabase
    .from("equipment_bookings")
    .select("quantity, access_dates, equipment_item:equipment_items(name, category, asset_number)")
    .eq("project_id", projectId);

  const entries = (bookings ?? []).map((booking) => {
    const item = Array.isArray(booking.equipment_item) ? booking.equipment_item[0] : booking.equipment_item;
    return {
      name: item?.name ?? "—",
      category: item?.category ?? "",
      asset_number: item?.asset_number ?? "",
      quantity: booking.quantity,
      access_dates: booking.access_dates ?? [],
    };
  });

  const pdfBuffer = await generatePakbonPdf(
    { projectName: project.name, generatedAt: new Date(), entries },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pakbon-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
