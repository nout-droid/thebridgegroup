import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHotelRequestPdf } from "@/lib/generate-hotel-request-pdf";

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

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
    const checkIn = dates[0] ?? "onbekend";
    const checkOut = dates[dates.length - 1] ?? "onbekend";
    return {
      name: member.name,
      role: member.role,
      checkIn,
      checkOut,
      nights: dates.length >= 2 ? nightsBetween(checkIn, checkOut) : 1,
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
