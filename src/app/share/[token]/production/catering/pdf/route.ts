import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCateringPdf } from "@/lib/generate-catering-pdf";
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

  const { data: items } = await admin
    .from("catering_orders")
    .select(
      "order_date, party, crew_lunch, veggie_lunch, crew_dinner, veggie_dinner, night_snacks, notes, allergies, supplier:suppliers(name), stage:stages(name)"
    )
    .eq("project_id", project.id)
    .order("order_date", { ascending: true })
    .order("sort_order", { ascending: true });

  const entries = (items ?? []).map((item) => ({
    order_date: item.order_date,
    party: item.party,
    crew_lunch: item.crew_lunch,
    veggie_lunch: item.veggie_lunch,
    crew_dinner: item.crew_dinner,
    veggie_dinner: item.veggie_dinner,
    night_snacks: item.night_snacks,
    notes: item.notes,
    allergies: item.allergies,
    supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
    stage_name: (item.stage as unknown as { name: string } | null)?.name ?? null,
  }));

  const pdfBuffer = await generateCateringPdf(
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
      "Content-Disposition": `attachment; filename="catering-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
