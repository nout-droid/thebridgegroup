import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSeatingPdf } from "@/lib/generate-seating-pdf";
import { getOrgBranding } from "@/lib/server/organization";
import type { EventGuest, SeatingTable } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Niet ingelogd", { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!project) return new NextResponse("Niet gevonden", { status: 404 });

  const branding = await getOrgBranding(project.user_id);

  const [{ data: tables }, { data: guests }] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("*, stage:stages(name)")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<(SeatingTable & { stage: { name: string } | null })[]>(),
    supabase
      .from("event_guests")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .returns<EventGuest[]>(),
  ]);

  const allGuests = guests ?? [];
  const allTables = tables ?? [];

  const pdfBuffer = await generateSeatingPdf(
    {
      projectName: project.name,
      generatedAt: new Date(),
      tables: allTables.map((table) => ({
        name: table.name,
        capacity: table.capacity,
        stage_name: table.stage?.name ?? null,
        notes: table.notes,
        guests: allGuests
          .filter((g) => g.table_id === table.id)
          .map((g) => ({
            name: g.name + (g.plus_ones > 0 ? ` (+${g.plus_ones})` : ""),
            headcount: 1 + g.plus_ones,
            dietary_notes: g.dietary_notes,
          })),
      })),
      unassigned: allGuests
        .filter((g) => !g.table_id)
        .map((g) => ({
          name: g.name + (g.plus_ones > 0 ? ` (+${g.plus_ones})` : ""),
          headcount: 1 + g.plus_ones,
        })),
    },
    branding
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tafelindeling-${project.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
