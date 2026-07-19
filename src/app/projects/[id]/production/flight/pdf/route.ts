import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFlightRequestPdf } from "@/lib/generate-flight-request-pdf";

function formatDateTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("nl-NL");
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
    .select(
      "name, passport_number, flight_departure_airport, flight_destination, flight_departure_at, flight_return_at, flight_booking_number, flight_ticket_number"
    )
    .eq("project_id", id)
    .eq("needs_flight", true)
    .order("sort_order", { ascending: true });

  const pdfBuffer = await generateFlightRequestPdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries: (members ?? []).map((member) => ({
      name: member.name,
      passportNumber: member.passport_number,
      departureAirport: member.flight_departure_airport,
      destination: member.flight_destination,
      departureAt: formatDateTime(member.flight_departure_at),
      returnAt: formatDateTime(member.flight_return_at),
      bookingNumber: member.flight_booking_number,
      ticketNumber: member.flight_ticket_number,
    })),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vluchtaanvraag-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
