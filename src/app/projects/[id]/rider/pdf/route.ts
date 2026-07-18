import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRiderPdf } from "@/lib/generate-rider-pdf";

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

  const { data: rider } = await supabase
    .from("riders")
    .select("id, version")
    .eq("project_id", id)
    .maybeSingle();

  const { data: sections } = rider
    ? await supabase
        .from("rider_sections")
        .select("id, title, content")
        .eq("rider_id", rider.id)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: items } = sectionIds.length
    ? await supabase
        .from("rider_section_items")
        .select("section_id, description")
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const pdfBuffer = await generateRiderPdf({
    projectName: project.name,
    version: rider?.version ?? 1,
    generatedAt: new Date(),
    sections: (sections ?? []).map((section) => ({
      title: section.title,
      content: section.content,
      items: (items ?? [])
        .filter((item) => item.section_id === section.id)
        .map((item) => ({ description: item.description })),
    })),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rider-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
