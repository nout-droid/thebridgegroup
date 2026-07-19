"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCrewFlightDetails(
  projectId: string,
  memberId: string,
  formData: FormData
) {
  const passportNumber = String(formData.get("passport_number") ?? "").trim();
  const departureAirport = String(formData.get("flight_departure_airport") ?? "").trim();
  const destination = String(formData.get("flight_destination") ?? "").trim();
  const departureAt = String(formData.get("flight_departure_at") ?? "") || null;
  const returnAt = String(formData.get("flight_return_at") ?? "") || null;
  const bookingNumber = String(formData.get("flight_booking_number") ?? "").trim();
  const ticketNumber = String(formData.get("flight_ticket_number") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("crew_members")
    .update({
      passport_number: passportNumber,
      flight_departure_airport: departureAirport,
      flight_destination: destination,
      flight_departure_at: departureAt,
      flight_return_at: returnAt,
      flight_booking_number: bookingNumber,
      flight_ticket_number: ticketNumber,
    })
    .eq("id", memberId);

  revalidatePath(`/projects/${projectId}/production/hotel`);
}
