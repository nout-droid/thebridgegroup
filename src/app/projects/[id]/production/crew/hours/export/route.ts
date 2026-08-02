import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCanViewBudget } from "@/lib/server/team";
import { getProjectOrNotFound } from "@/lib/server/get-project";

interface HoursRow {
  name: string;
  role: string;
  per_diem_rate: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function hoursWorked(checkedIn: string | null, checkedOut: string | null): number | null {
  if (!checkedIn || !checkedOut) return null;
  const ms = new Date(checkedOut).getTime() - new Date(checkedIn).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);
  const canViewBudget = await checkCanViewBudget(supabase, id);
  if (!canViewBudget) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const { data: members } = await supabase
    .from("crew_members")
    .select("name, role, per_diem_rate, checked_in_at, checked_out_at")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<HoursRow[]>();

  const rows = [
    ["Naam", "Functie", "Ingecheckt", "Uitgecheckt", "Uren", "Dagvergoeding"],
    ...(members ?? []).map((m) => [
      m.name,
      m.role,
      m.checked_in_at ?? "",
      m.checked_out_at ?? "",
      hoursWorked(m.checked_in_at, m.checked_out_at)?.toFixed(2) ?? "",
      m.checked_in_at ? m.per_diem_rate.toFixed(2) : "",
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uren-${project.name.replace(/[^a-z0-9]+/gi, "-")}.csv"`,
    },
  });
}
