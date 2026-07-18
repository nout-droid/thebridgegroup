#!/usr/bin/env node
// Dumpt alle applicatiedata (public schema) via de Supabase REST API naar één JSON-bestand.
// Gebruikt de service-role key (leest .env.local), dus bypassed RLS volledig — bevat alles.
//
// Gebruik: node scripts/backup-database.mjs [output-pad]
// Zonder argument schrijft naar backups/backup-<timestamp>.json (gitignored).
//
// Tabellen staan in dezelfde volgorde als de create-table-statements in
// supabase/full_schema.sql — dat is meteen ook de juiste volgorde om bij een
// restore weer in te laden (referenced tables eerst, foreign keys daarna).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// catalog_articles en rental_period_multipliers zitten hier bewust NIET in:
// - rental_period_multipliers is statische seed-data die al in full_schema.sql
//   staat (create + insert), dus altijd terug te zetten door dat bestand
//   opnieuw te draaien — nooit door de eigenaar bewerkt.
// - catalog_articles is de geïmporteerde Rent-All-catalogus (1800+ regels,
//   verreweg de meeste data in de database) en opnieuw te importeren via de
//   CSV-upload op /suppliers met scripts/rentall-catalog.csv. Meenemen zou de
//   back-up nodeloos groot maken voor data die al ergens anders herstelbaar is.
const TABLES = [
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
];

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

async function fetchAllRows(baseUrl, serviceRoleKey, table) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const url = `${baseUrl}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!res.ok) {
      throw new Error(`${table}: ${res.status} ${await res.text()}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function main() {
  const env = loadEnvLocal();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local");
  }

  const dump = {
    generated_at: new Date().toISOString(),
    source: baseUrl,
    tables: {},
  };

  for (const table of TABLES) {
    dump.tables[table] = await fetchAllRows(baseUrl, serviceRoleKey, table);
  }

  dump.row_counts = Object.fromEntries(
    Object.entries(dump.tables).map(([table, rows]) => [table, rows.length])
  );

  const outPath =
    process.argv[2] ??
    path.join(__dirname, "..", "backups", `backup-${dump.generated_at.replace(/[:.]/g, "-")}.json`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));

  console.error(`Backup geschreven naar ${outPath}`);
  console.error(JSON.stringify(dump.row_counts, null, 2));
  console.log(outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
