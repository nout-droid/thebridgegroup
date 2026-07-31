import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePowerPdf } from "@/lib/generate-power-pdf";
import { getOrgBranding } from "@/lib/server/organization";
import { computePowerLoadKw } from "@/lib/types";

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
    .from("power_requests")
    .select("description, quantity, position, notes, amps, phase, supplier:suppliers(name), stage:stages(name)")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  const entries = (items ?? []).map((item) => ({
    description: item.description,
    quantity: item.quantity,
    position: item.position,
    notes: item.notes,
    amps: item.amps as number | null,
    phase: (item.phase as 1 | 3) ?? 1,
    supplier_name: (item.supplier as unknown as { name: string } | null)?.name ?? null,
    stage_name: (item.stage as unknown as { name: string } | null)?.name ?? null,
  }));

  const areaLoadMap = new Map<string, number>();
  for (const entry of entries) {
    const areaName = entry.stage_name ?? "Projectbreed";
    const kw = computePowerLoadKw(entry.amps, entry.phase, entry.quantity);
    areaLoadMap.set(areaName, (areaLoadMap.get(areaName) ?? 0) + kw);
  }
  const areaLoads = [...areaLoadMap.entries()]
    .map(([areaName, kw]) => ({ areaName, kw }))
    .filter((entry) => entry.kw > 0)
    .sort((a, b) => a.areaName.localeCompare(b.areaName));
  const totalKw = areaLoads.reduce((sum, entry) => sum + entry.kw, 0);

  const pdfBuffer = await generatePowerPdf(
    {
      projectName: project.name,
      generatedAt: new Date(),
      entries,
      areaLoads,
      totalKw,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="stroom-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
