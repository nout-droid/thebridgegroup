import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRiderPdf } from "@/lib/generate-rider-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("share_token", token)
      .maybeSingle();
    isOwner = Boolean(ownedProject);
  }

  if (!isOwner) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`client_token_${token}`)) {
      return new NextResponse("Niet ingelogd", { status: 401 });
    }
  }

  const { data: riderData } = await supabase.rpc("get_shared_rider", {
    p_share_token: token,
  });
  const { data: projectData } = await supabase.rpc("get_shared_project", {
    p_token: token,
  });

  if (!riderData || !projectData?.project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const pdfBuffer = await generateRiderPdf({
    projectName: projectData.project.name,
    version: riderData.version,
    generatedAt: new Date(),
    sections: riderData.sections.map(
      (section: {
        title: string;
        content: string;
        stage_name: string | null;
        items: { description: string }[];
      }) => ({
        title: section.stage_name ? `[${section.stage_name}] ${section.title}` : section.title,
        content: section.content,
        items: section.items,
      })
    ),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rider-${projectData.project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
