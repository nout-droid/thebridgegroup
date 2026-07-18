#!/usr/bin/env node
// Zet een backup-JSON (gemaakt door scripts/backup-database.mjs) terug in Supabase.
//
// GEBRUIK BIJ EEN CRITICAL CRASH — volg deze volgorde:
//   1. Nieuw (of leeggemaakt) Supabase-project klaarzetten, env-vars in .env.local
//      zetten (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//      SUPABASE_SERVICE_ROLE_KEY).
//   2. Het volledige schema aanmaken: plak supabase/full_schema.sql in de
//      Supabase SQL Editor en voer uit. Dit maakt ook meteen de statische
//      rental_period_multipliers-data aan (die zit expres niet in de backup).
//   3. De Rent-All-catalogus terugzetten: log in als eigenaar, ga naar
//      /suppliers, en upload scripts/rentall-catalog.csv opnieuw bij de
//      juiste leverancier. Dit MOET vóór stap 4, anders klapt de restore op
//      offerteregels die naar een (nog) niet-bestaand catalog_article_id
//      verwijzen.
//   4. Download de meest recente backup-*.json uit de Google Drive-map
//      "The Bridge — App Backups" en draai:
//        node scripts/restore-database.mjs pad/naar/backup-....json
//   5. Auth-gebruikers (jouw inlog-account) zitten NIET in deze backup —
//      die staan los in Supabase Auth. Als dat account er niet meer is,
//      maak 'm opnieuw aan via Supabase → Authentication → Users, met
//      hetzelfde e-mailadres als voorheen (het EIGENAARSCHAP van projecten
//      is gekoppeld aan de user_id die in de backup staat, niet aan het
//      e-mailadres zelf — als de nieuwe user_id afwijkt, zie je de
//      teruggezette projecten niet totdat je in de database het user_id-veld
//      van elk project bijwerkt naar de nieuwe auth-user-id).
//
// Dit script is idempotent: het gebruikt "Prefer: resolution=merge-duplicates"
// (upsert op id), dus opnieuw draaien overschrijft gewoon dezelfde rijen
// zonder duplicaten of fouten.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Zelfde volgorde als backup-database.mjs / supabase/full_schema.sql —
// referenced tables eerst, zodat foreign keys altijd al bestaan.
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

async function upsertRows(baseUrl, serviceRoleKey, table, rows) {
  if (!rows.length) return;

  const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Gebruik: node scripts/restore-database.mjs pad/naar/backup-....json");
    process.exit(1);
  }

  const env = loadEnvLocal();
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local");
  }

  const dump = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  console.error(`Backup van ${dump.generated_at} (bron: ${dump.source})`);
  console.error("Terugzetten...");

  for (const table of TABLES) {
    const rows = dump.tables[table] ?? [];
    process.stderr.write(`  ${table}: ${rows.length} rijen... `);
    await upsertRows(baseUrl, serviceRoleKey, table, rows);
    console.error("ok");
  }

  console.error("Klaar. Controleer de app en vergeet stap 3 (Rent-All-catalogus) niet als je dat nog niet had gedaan.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
