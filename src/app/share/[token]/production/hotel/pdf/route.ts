import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateHotelRequestPdf } from "@/lib/generate-hotel-request-pdf";
import { computeNights } from "@/lib/nights";

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

  const { data: members } = await admin
    .from("crew_members")
    .select("name, role, access_dates")
    .eq("project_id", project.id)
    .eq("needs_hotel", true)
    .order("sort_order", { ascending: true });

  const entries = (members ?? []).map((member) => {
    const dates = [...(member.access_dates ?? [])].sort();
    return {
      name: member.name,
      role: member.role,
      checkIn: dates[0] ?? "onbekend",
      checkOut: dates[dates.length - 1] ?? "onbekend",
      nights: computeNights(dates),
    };
  });

  const pdfBuffer = await generateHotelRequestPdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hotelaanvraag-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
