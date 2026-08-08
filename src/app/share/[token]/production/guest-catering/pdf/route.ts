import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateGuestCateringPdf } from "@/lib/generate-guest-catering-pdf";
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

  const [{ data: orders }, { data: guests }] = await Promise.all([
    admin
      .from("guest_catering_orders")
      .select(
        "order_date, moment, style, guest_count, veggie_count, vegan_count, kids_count, special_diet_count, notes, allergies, supplier:suppliers(name), stage:stages(name)"
      )
      .eq("project_id", project.id)
      .order("order_date", { ascending: true })
      .order("sort_order", { ascending: true }),
    admin
      .from("event_guests")
      .select("name, plus_one_name, dietary_notes")
      .eq("project_id", project.id)
      .neq("dietary_notes", "")
      .order("sort_order", { ascending: true }),
  ]);

  const pdfBuffer = await generateGuestCateringPdf(
    {
      projectName: project.name,
      generatedAt: new Date(),
      entries: (orders ?? []).map((item) => ({
        order_date: item.order_date,
        stage_name: (item.stage as unknown as { name: string } | null)?.name ?? null,
        moment: item.moment,
        style: item.style,
        guest_count: item.guest_count,
        veggie_count: item.veggie_count,
        vegan_count: item.vegan_count,
        kids_count: item.kids_count,
        special_diet_count: item.special_diet_count,
        supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
        notes: item.notes,
        allergies: item.allergies,
      })),
      dietary: (guests ?? []).map((g) => ({
        name: g.name,
        plus_one_name: g.plus_one_name,
        dietary_notes: g.dietary_notes,
      })),
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="catering-gasten-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
