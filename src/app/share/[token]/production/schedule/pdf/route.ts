import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSchedulePdf } from "@/lib/generate-schedule-pdf";

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
    .from("schedule_items")
    .select(
      "activity_date, activity_time, activity, priority, notes, stage:stages(name), suppliers:schedule_item_suppliers(supplier:suppliers(name))"
    )
    .eq("project_id", project.id)
    .order("activity_date", { ascending: true })
    .order("activity_time", { ascending: true });

  const entries = (items ?? []).map((item) => ({
    activity_date: item.activity_date,
    activity_time: item.activity_time,
    activity: item.activity,
    priority: item.priority,
    notes: item.notes,
    supplier_names:
      (item.suppliers as unknown as { supplier: { name: string } | null }[])
        .map((s) => s.supplier?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || null,
    stage_name: (item.stage as unknown as { name: string } | null)?.name ?? null,
  }));

  const pdfBuffer = await generateSchedulePdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="draaiboek-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
