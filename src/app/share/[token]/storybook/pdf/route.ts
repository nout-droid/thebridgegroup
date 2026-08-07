import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStorybookPdf } from "@/lib/generate-storybook-pdf";
import { getOrgBranding } from "@/lib/server/organization";
import { resolveImageBuffer } from "@/lib/pdf-branding";

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

  const { data: storybookData } = await supabase.rpc("get_shared_storybook", {
    p_share_token: token,
  });
  const { data: projectData } = await supabase.rpc("get_shared_project", {
    p_token: token,
  });

  if (!storybookData || !projectData?.project) {
    return new NextResponse("Niet gevonden", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: ownerProject } = await admin
    .from("projects")
    .select("user_id")
    .eq("share_token", token)
    .maybeSingle();
  const branding = await getOrgBranding(ownerProject?.user_id);

  // @react-pdf/renderer laadt image-URL's onbetrouwbaar zelf op; eerst zelf ophalen als
  // Buffer (zoals het org-logo) i.p.v. de rauwe URL doorgeven — zie resolveImageBuffer.
  const chapters = await Promise.all(
    storybookData.map(
      async (chapter: { title: string; description: string; images: { url: string; caption: string }[] }) => {
        const images = (
          await Promise.all(
            chapter.images.map(async (image) => ({
              buffer: await resolveImageBuffer(image.url),
              caption: image.caption,
            }))
          )
        ).filter((image): image is { buffer: Buffer; caption: string } => image.buffer !== null);
        return { title: chapter.title, description: chapter.description, images };
      }
    )
  );

  const pdfBuffer = await generateStorybookPdf(
    {
      projectName: projectData.project.name,
      generatedAt: new Date(),
      chapters,
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="storybook-${projectData.project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
