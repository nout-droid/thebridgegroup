import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStorybookPdf } from "@/lib/generate-storybook-pdf";
import { getOrgBranding } from "@/lib/server/organization";
import type { StorybookImage } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Niet ingelogd", { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!project) return new NextResponse("Niet gevonden", { status: 404 });

  const branding = await getOrgBranding(project.user_id);

  const { data: chapters } = await supabase
    .from("storybook_chapters")
    .select("id, title, description")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: images } = chapterIds.length
    ? await supabase
        .from("storybook_images")
        .select("*")
        .in("chapter_id", chapterIds)
        .order("sort_order", { ascending: true })
        .returns<StorybookImage[]>()
    : { data: [] };

  const pdfBuffer = await generateStorybookPdf(
    {
      projectName: project.name,
      generatedAt: new Date(),
      chapters: (chapters ?? []).map((chapter) => ({
        title: chapter.title,
        description: chapter.description,
        images: (images ?? [])
          .filter((image) => image.chapter_id === chapter.id)
          .map((image) => ({ url: image.url, caption: image.caption })),
      })),
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="storybook-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
