import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/server/origin";
import { getWeatherForecast } from "@/lib/server/weather";
import { renderWeatherAlertEmail } from "@/lib/server/weather-alert-email";
import { isBadWeather } from "@/lib/weather-conditions";

const DAYS_AHEAD = 3;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + DAYS_AHEAD);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  const { data: projects } = await admin
    .from("projects")
    .select("id, name, event_date, user_id, venue:venues(name, address)")
    .is("weather_alert_sent_at", null)
    .gte("event_date", todayStr)
    .lte("event_date", windowEndStr);

  if (!projects || projects.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  type Row = {
    id: string;
    name: string;
    event_date: string;
    user_id: string;
    venue: { name: string; address: string | null } | { name: string; address: string | null }[] | null;
  };

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const origin = await getOrigin();
  const alertedIds: string[] = [];
  let sent = 0;

  for (const row of projects as Row[]) {
    const venue = Array.isArray(row.venue) ? row.venue[0] : row.venue;
    if (!venue?.address) continue;

    const forecastDays = await getWeatherForecast(venue.address);
    const forecast = forecastDays?.find((d) => d.date === row.event_date);
    if (!forecast || !isBadWeather(forecast)) continue;

    // Ook als er geen mailer geconfigureerd is, markeren als afgehandeld — anders proberen we
    // dit project elke dag opnieuw te bevragen zonder ooit een e-mail te kunnen versturen.
    alertedIds.push(row.id);

    if (!resend || !process.env.RESEND_FROM_EMAIL) continue;

    const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    const { subject, html } = renderWeatherAlertEmail(origin, row.id, row.name, venue.name, forecast);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    if (!error) sent += 1;
  }

  if (alertedIds.length > 0) {
    await admin.from("projects").update({ weather_alert_sent_at: new Date().toISOString() }).in("id", alertedIds);
  }

  return NextResponse.json({ sent, checked: alertedIds.length });
}
