import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHotelRequestPdf } from "@/lib/generate-hotel-request-pdf";
import { computeNights } from "@/lib/nights";

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

  const { data: members } = await supabase
    .from("crew_members")
    .select("name, role, access_dates")
    .eq("project_id", id)
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
