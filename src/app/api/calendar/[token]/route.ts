import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_TYPE_LABELS, type Project } from "@/lib/types";

// Zelfde vensterberekening als /calendar (build_start_date t/m strike_end_date, met fallback
// op show/event-datum) — één VEVENT per project voor de fysieke bezetting. Geen aparte
// pre-productie-event: dat zou de agenda van de gebruiker onnodig vervuilen met "voorlopige"
// blokken; de pre-productieduur staat al genoemd in de beschrijving.
function occupationWindow(project: Project): { start: string; end: string } | null {
  const start = project.build_start_date ?? project.show_start_date ?? project.event_date;
  const end = project.strike_end_date ?? project.show_end_date ?? project.event_date;
  if (!start || !end) return null;
  return { start, end };
}

function toIcsDate(dateStr: string): string {
  return dateStr.replaceAll("-", "");
}

// DTEND is exclusief in RFC 5545 voor all-day events — één dag optellen zodat het laatste
// bezettingsdag ook echt als bezet getoond wordt in de agenda-app.
function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545: regels langer dan 75 octets moeten gevouwen worden met een newline + spatie.
  if (line.length <= 75) return line;
  let result = "";
  let rest = line;
  while (rest.length > 75) {
    result += rest.slice(0, 75) + "\r\n ";
    rest = rest.slice(75);
  }
  return result + rest;
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: organization } = await admin
    .from("organizations")
    .select("owner_user_id, name")
    .eq("ics_token", token)
    .maybeSingle();

  if (!organization) {
    return new Response("Not found", { status: 404 });
  }

  const { data: projects } = await admin
    .from("projects")
    .select("*")
    .eq("user_id", organization.owner_user_id)
    .returns<Project[]>();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Bridge Productie//Kalendersync//NL",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(organization.name)} — Projecten`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
  ];

  for (const project of projects ?? []) {
    const window = occupationWindow(project);
    if (!window) continue;

    const eventTypeLabel = EVENT_TYPE_LABELS[project.event_type];
    const descriptionParts = [project.client_name, eventTypeLabel].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${project.id}@thebridgeavgroup.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${toIcsDate(window.start)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addOneDay(window.end))}`,
      foldLine(`SUMMARY:${escapeIcsText(project.name)}`),
      ...(descriptionParts.length ? [foldLine(`DESCRIPTION:${escapeIcsText(descriptionParts.join(" — "))}`)] : []),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="projecten.ics"',
      "Cache-Control": "public, max-age=1800",
    },
  });
}
