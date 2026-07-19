import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCateringPdf } from "@/lib/generate-catering-pdf";

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
    .from("catering_orders")
    .select(
      "order_date, party, crew_lunch, veggie_lunch, crew_dinner, veggie_dinner, night_snacks, notes, supplier:suppliers(name)"
    )
    .eq("project_id", id)
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
    supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
  }));

  const pdfBuffer = await generateCateringPdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="catering-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
