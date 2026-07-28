import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFlightRequestPdf } from "@/lib/generate-flight-request-pdf";

function formatDateTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("nl-NL");
}

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
    .select(
      "name, flight_departure_airport, flight_destination, flight_departure_at, flight_return_at"
    )
    .eq("project_id", project.id)
    .eq("needs_flight", true)
    .order("sort_order", { ascending: true });

  // Bewust geen paspoort-/boekings-/ticketnummer in de klant-versie van deze PDF — dat is
  // interne/gevoelige crewdata, geen klantinfo (zelfde afweging als get_shared_production).
  const pdfBuffer = await generateFlightRequestPdf({
    projectName: project.name,
    generatedAt: new Date(),
    entries: (members ?? []).map((member) => ({
      name: member.name,
      passportNumber: "",
      departureAirport: member.flight_departure_airport,
      destination: member.flight_destination,
      departureAt: formatDateTime(member.flight_departure_at),
      returnAt: formatDateTime(member.flight_return_at),
      bookingNumber: "",
      ticketNumber: "",
    })),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vluchtaanvraag-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
