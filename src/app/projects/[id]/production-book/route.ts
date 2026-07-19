import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRiderPdf } from "@/lib/generate-rider-pdf";
import { generateHotelRequestPdf } from "@/lib/generate-hotel-request-pdf";
import { generateFlightRequestPdf } from "@/lib/generate-flight-request-pdf";
import { generateSchedulePdf } from "@/lib/generate-schedule-pdf";
import { generateEquipmentPdf } from "@/lib/generate-equipment-pdf";
import { generateCommsPdf } from "@/lib/generate-comms-pdf";
import { generatePowerPdf } from "@/lib/generate-power-pdf";
import { generateCateringPdf } from "@/lib/generate-catering-pdf";
import { mergePdfBuffers } from "@/lib/merge-pdfs";
import { computeNights } from "@/lib/nights";

function formatDateTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("nl-NL");
}

function name(rel: unknown): string | null {
  return (rel as { name: string } | null)?.name ?? null;
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

  const generatedAt = new Date();
  const buffers: Buffer[] = [];

  // Rider
  const { data: rider } = await supabase
    .from("riders")
    .select("id, version")
    .eq("project_id", id)
    .maybeSingle();
  const { data: riderSections } = rider
    ? await supabase
        .from("rider_sections")
        .select("id, title, content")
        .eq("rider_id", rider.id)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const riderSectionIds = (riderSections ?? []).map((s) => s.id);
  const { data: riderItems } = riderSectionIds.length
    ? await supabase
        .from("rider_section_items")
        .select("section_id, description")
        .in("section_id", riderSectionIds)
        .order("sort_order", { ascending: true })
    : { data: [] };
  if (riderSections?.length) {
    buffers.push(
      await generateRiderPdf({
        projectName: project.name,
        version: rider?.version ?? 1,
        generatedAt,
        sections: riderSections.map((section) => ({
          title: section.title,
          content: section.content,
          items: (riderItems ?? [])
            .filter((item) => item.section_id === section.id)
            .map((item) => ({ description: item.description })),
        })),
      })
    );
  }

  // Hotel
  const { data: hotelMembers } = await supabase
    .from("crew_members")
    .select("name, role, access_dates")
    .eq("project_id", id)
    .eq("needs_hotel", true)
    .order("sort_order", { ascending: true });
  if (hotelMembers?.length) {
    const entries = hotelMembers.map((member) => {
      const dates = [...(member.access_dates ?? [])].sort();
      return {
        name: member.name,
        role: member.role,
        checkIn: dates[0] ?? "onbekend",
        checkOut: dates[dates.length - 1] ?? "onbekend",
        nights: computeNights(dates),
      };
    });
    buffers.push(await generateHotelRequestPdf({ projectName: project.name, generatedAt, entries }));
  }

  // Vluchten
  const { data: flightMembers } = await supabase
    .from("crew_members")
    .select(
      "name, passport_number, flight_departure_airport, flight_destination, flight_departure_at, flight_return_at, flight_booking_number, flight_ticket_number"
    )
    .eq("project_id", id)
    .eq("needs_flight", true)
    .order("sort_order", { ascending: true });
  if (flightMembers?.length) {
    buffers.push(
      await generateFlightRequestPdf({
        projectName: project.name,
        generatedAt,
        entries: flightMembers.map((member) => ({
          name: member.name,
          passportNumber: member.passport_number,
          departureAirport: member.flight_departure_airport,
          destination: member.flight_destination,
          departureAt: formatDateTime(member.flight_departure_at),
          returnAt: formatDateTime(member.flight_return_at),
          bookingNumber: member.flight_booking_number,
          ticketNumber: member.flight_ticket_number,
        })),
      })
    );
  }

  // Draaiboek
  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select(
      "activity_date, activity_time, activity, priority, notes, stage:stages(name), suppliers:schedule_item_suppliers(supplier:suppliers(name))"
    )
    .eq("project_id", id)
    .order("activity_date", { ascending: true })
    .order("activity_time", { ascending: true });
  if (scheduleItems?.length) {
    buffers.push(
      await generateSchedulePdf({
        projectName: project.name,
        generatedAt,
        entries: scheduleItems.map((item) => ({
          activity_date: item.activity_date,
          activity_time: item.activity_time,
          activity: item.activity,
          priority: item.priority,
          notes: item.notes,
          supplier_names:
            (item.suppliers as unknown as { supplier: { name: string } | null }[])
              .map((s) => s.supplier?.name)
              .filter((n): n is string => Boolean(n))
              .join(", ") || null,
          stage_name: name(item.stage),
        })),
      })
    );
  }

  // Materieel
  const { data: equipment } = await supabase
    .from("equipment_reservations")
    .select("machine_type, quantity, accessories, reservation_date, duration, key_holder, supplier:suppliers(name)")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });
  if (equipment?.length) {
    buffers.push(
      await generateEquipmentPdf({
        projectName: project.name,
        generatedAt,
        entries: equipment.map((item) => ({
          machine_type: item.machine_type,
          quantity: item.quantity,
          accessories: item.accessories,
          reservation_date: item.reservation_date,
          duration: item.duration,
          key_holder: item.key_holder,
          supplier_name: name(item.supplier),
        })),
      })
    );
  }

  // Comms & portofoons
  const { data: comms } = await supabase
    .from("comms_assignments")
    .select("kind, user_name, device_type, channels, supplier:suppliers(name), crew_member:crew_members(name)")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });
  if (comms?.length) {
    const toEntry = (item: NonNullable<typeof comms>[number]) => ({
      user_name: item.user_name,
      device_type: item.device_type,
      channels: item.channels,
      supplier_name: name(item.supplier),
      crew_member_name: name(item.crew_member),
    });
    buffers.push(
      await generateCommsPdf({
        projectName: project.name,
        generatedAt,
        intercom: comms.filter((a) => a.kind === "intercom").map(toEntry),
        portofoon: comms.filter((a) => a.kind === "portofoon").map(toEntry),
      })
    );
  }

  // Stroom
  const { data: power } = await supabase
    .from("power_requests")
    .select("description, quantity, position, notes, supplier:suppliers(name), stage:stages(name)")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });
  if (power?.length) {
    buffers.push(
      await generatePowerPdf({
        projectName: project.name,
        generatedAt,
        entries: power.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          position: item.position,
          notes: item.notes,
          supplier_name: name(item.supplier),
          stage_name: name(item.stage),
        })),
      })
    );
  }

  // Catering
  const { data: catering } = await supabase
    .from("catering_orders")
    .select(
      "order_date, party, crew_lunch, veggie_lunch, crew_dinner, veggie_dinner, night_snacks, notes, supplier:suppliers(name)"
    )
    .eq("project_id", id)
    .order("order_date", { ascending: true })
    .order("sort_order", { ascending: true });
  if (catering?.length) {
    buffers.push(
      await generateCateringPdf({
        projectName: project.name,
        generatedAt,
        entries: catering.map((item) => ({
          order_date: item.order_date,
          party: item.party,
          crew_lunch: item.crew_lunch,
          veggie_lunch: item.veggie_lunch,
          crew_dinner: item.crew_dinner,
          veggie_dinner: item.veggie_dinner,
          night_snacks: item.night_snacks,
          notes: item.notes,
          supplier_name: name(item.supplier),
        })),
      })
    );
  }

  if (!buffers.length) {
    return new NextResponse("Nog geen gegevens om te bundelen", { status: 404 });
  }

  const merged = await mergePdfBuffers(buffers);

  return new NextResponse(new Uint8Array(merged), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="productieboek-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
