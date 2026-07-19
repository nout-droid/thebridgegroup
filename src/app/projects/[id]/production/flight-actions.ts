"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory, findOrCreateQuote } from "@/lib/server/category-helpers";
import type { MarginType } from "@/lib/types";

function revalidateBudget(projectId: string) {
  revalidatePath(`/projects/${projectId}/production/hotel`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveFlightCost(projectId: string, formData: FormData) {
  const supplierId = String(formData.get("supplier_id") ?? "");
  const costPrice = Number(formData.get("cost_price") ?? 0);
  const marginType = String(formData.get("margin_type") ?? "percentage") as MarginType;
  const marginValue = Number(formData.get("margin_value") ?? 0);

  if (!supplierId) return;

  const supabase = await createClient();
  const categoryId = await findOrCreateCategory(supabase, projectId, null, "Vluchten");
  if (!categoryId) return;

  await supabase
    .from("categories")
    .update({ margin_type: marginType, margin_value: marginValue })
    .eq("id", categoryId);

  const quoteId = await findOrCreateQuote(supabase, categoryId, supplierId, "Vluchtkosten");
  if (quoteId) {
    await supabase.from("quotes").update({ cost_price: costPrice }).eq("id", quoteId);
  }

  revalidateBudget(projectId);
}

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
