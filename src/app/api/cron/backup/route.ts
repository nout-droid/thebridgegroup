import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dagelijkse volledige databank-backup, geschreven naar de bestaande "portal-documents"
// storage-bucket (private) i.p.v. Google Drive — we hebben geen Drive-API-credentials in
// deze omgeving, en dit vereist geen nieuwe bucket/migratie. Zelfde tabellenlijst als
// scripts/backup-database.mjs (dat script blijft bruikbaar voor een handmatige lokale
// back-up); dit is de geautomatiseerde, dagelijkse variant ervan.
const TABLES = [
  "organizations",
  "team_members",
  "team_member_project_access",
  "client_accounts",
  "client_account_projects",
  "projects",
  "suppliers",
  "categories",
  "quotes",
  "material_list_items",
  "quote_line_items",
  "stages",
  "article_aliases",
  "project_media",
  "quote_documents",
  "guest_documents",
  "riders",
  "rider_sections",
  "rider_section_items",
  "schedule_items",
  "crew_members",
  "equipment_reservations",
  "comms_assignments",
  "catering_orders",
  "artist_riders",
  "open_questions",
  "meeting_notes",
  "power_requests",
  "rundowns",
  "rundown_items",
  "crew_notes",
  "rundown_item_instructions",
  "event_guests",
  "client_requests",
  "activity_log",
  "project_documents",
  "project_evaluations",
];

const BUCKET = "portal-documents";
const BACKUP_PREFIX = "system-backups";
const RETENTION_COUNT = 14;

async function fetchAllRows(admin: ReturnType<typeof createAdminClient>, table: string) {
  const rows: unknown[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await admin.from(table).select("*").range(offset, offset + pageSize - 1);
    if (error) {
      // Sommige tabellen bestaan mogelijk nog niet (migratie nog niet gedraaid) — een
      // ontbrekende tabel mag de rest van de back-up niet blokkeren.
      return { rows: [], skipped: true, error: error.message };
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }

  return { rows, skipped: false };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const generatedAt = new Date().toISOString();
  const dump: { generated_at: string; tables: Record<string, unknown[]>; row_counts: Record<string, number> } = {
    generated_at: generatedAt,
    tables: {},
    row_counts: {},
  };

  for (const table of TABLES) {
    const result = await fetchAllRows(admin, table);
    dump.tables[table] = result.rows as unknown[];
    dump.row_counts[table] = result.rows.length;
  }

  const path = `${BACKUP_PREFIX}/backup-${generatedAt.replace(/[:.]/g, "-")}.json`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, JSON.stringify(dump), { contentType: "application/json" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Bewaar alleen de laatste RETENTION_COUNT back-ups om storage niet onbeperkt te laten groeien.
  const { data: existing } = await admin.storage.from(BUCKET).list(BACKUP_PREFIX, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (existing && existing.length > RETENTION_COUNT) {
    const toDelete = existing.slice(0, existing.length - RETENTION_COUNT).map((f) => `${BACKUP_PREFIX}/${f.name}`);
    if (toDelete.length) await admin.storage.from(BUCKET).remove(toDelete);
  }

  // Dezelfde dagelijkse cron ruimt meteen ook oude rate-limit-pogingen op (no-op zolang
  // migrations_login_attempts.sql nog niet is gedraaid).
  await admin.rpc("cleanup_old_login_attempts");

  return NextResponse.json({ path, row_counts: dump.row_counts });
}
