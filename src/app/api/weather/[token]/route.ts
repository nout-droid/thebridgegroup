import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeatherForecast } from "@/lib/server/weather";

// Gebruikt hetzelfde share_token als crew-/showcaller-portalen, dus geen aparte auth nodig —
// het token zelf is de enige sleutel die nodig is (geen gevoelige data in de response, puur
// een weersvoorspelling voor de venue-locatie van het project).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("venue_id")
    .eq("share_token", token)
    .maybeSingle();

  if (!project?.venue_id) {
    return NextResponse.json({ days: [] });
  }

  const { data: venue } = await admin
    .from("venues")
    .select("address")
    .eq("id", project.venue_id)
    .maybeSingle();

  if (!venue?.address) {
    return NextResponse.json({ days: [] });
  }

  const days = await getWeatherForecast(venue.address);
  return NextResponse.json({ days: days ?? [] });
}
