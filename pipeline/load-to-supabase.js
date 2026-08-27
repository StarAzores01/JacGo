#!/usr/bin/env node
/* load-to-supabase.js — one-time (but safely re-runnable) loader that
 * reads pipeline/output/accommodations.json and pois.json and upserts
 * them into the Supabase `accommodation` and `pois` tables (see
 * supabase/migrations/0001_init.sql for their schema).
 *
 * Uses the service_role key — this is a trusted script you run manually
 * from your own machine, never shipped to the browser (unlike the anon
 * key in js/config.js). The service_role key bypasses Row Level Security
 * entirely, which is exactly what's needed here since neither table has
 * a client-facing INSERT/UPDATE policy (see 0001_init.sql's RLS section
 * — public reference tables are written by an admin/pipeline path like
 * this one, not by end users). Never commit this key: it's read from an
 * environment variable, not hardcoded, and nothing here writes it to disk.
 *
 * Dedupe: the pipeline's own `id` field (a short hash of `source:
 * source_id` — see pipeline/README.md's "Schemas" section, and
 * dedupe.js) is what actually identifies a record across re-runs, not
 * the raw `source_id` (e.g. "node/12345"), which isn't guaranteed unique
 * on its own. That's why the `accommodation`/`pois` tables have a unique
 * `pipeline_id` column distinct from `source_id` — this script upserts
 * on `pipeline_id`, so running it again after a fresh pipeline run
 * updates existing rows in place instead of duplicating them. Hand-
 * entered rows (the 5 accommodation listings seeded by
 * supabase/migrations/0003_seed_reference_data.sql) have no
 * `pipeline_id` and are untouched by this script either way.
 *
 * Usage:
 *   cd pipeline
 *   npm install                      (first time only — pulls in @supabase/supabase-js)
 *   SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key... \
 *   node load-to-supabase.js
 *
 * Find both values in: Supabase dashboard -> Project Settings -> API
 * (SUPABASE_URL is the same "Project URL" js/config.js uses;
 * SUPABASE_SERVICE_ROLE_KEY is the separate "service_role" secret key on
 * that same page — NOT the "anon public" key).
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  console.error("See the usage comment at the top of pipeline/load-to-supabase.js.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OUTPUT_DIR = path.join(__dirname, "output");
const BATCH_SIZE = 500; // keep individual upsert payloads modest-sized

function readOutputJson(filename) {
  const full = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(full)) {
    throw new Error(`${full} not found — run \`node run.js\` first to generate pipeline output.`);
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

/* pipeline record -> accommodation row. location/price/rating/source_url
 * aren't part of the pipeline's output schema (pipeline/README.md) — left
 * out here entirely so an upsert never overwrites those columns with
 * null on a row that already has hand-curated values. */
function toAccommodationRow(a) {
  return {
    pipeline_id: a.id,
    name: a.name,
    type: a.type ?? null,
    province: a.province ?? null,
    price_level: a.price_level ?? null,
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    source: a.source ?? null,
    source_id: a.source_id ?? null,
    last_updated: a.last_updated ?? null,
  };
}

function toPoiRow(p) {
  return {
    pipeline_id: p.id,
    name: p.name,
    category: p.category ?? null,
    description: p.description ?? null,
    province: p.province ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    source: p.source ?? null,
    source_id: p.source_id ?? null,
    source_url: p.source_url ?? null,
    wikipedia_url: p.wikipedia_url ?? null,
    last_updated: p.last_updated ?? null,
  };
}

async function upsertInBatches(table, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "pipeline_id" });
    if (error) {
      throw new Error(`${table}: upsert failed on rows ${i}-${i + batch.length - 1}: ${error.message}`);
    }
    console.log(`  ${table}: upserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function tableCount(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: count failed: ${error.message}`);
  return count;
}

async function main() {
  console.log("Reading pipeline output...");
  const accommodations = readOutputJson("accommodations.json");
  const pois = readOutputJson("pois.json");
  console.log(`  accommodations.json: ${accommodations.length} records`);
  console.log(`  pois.json: ${pois.length} records`);

  console.log("\nUpserting accommodation...");
  await upsertInBatches("accommodation", accommodations.map(toAccommodationRow));

  console.log("\nUpserting pois...");
  await upsertInBatches("pois", pois.map(toPoiRow));

  const accCount = await tableCount("accommodation");
  const poiCount = await tableCount("pois");

  console.log("\nDone.");
  console.log(`  accommodation table: ${accCount} rows total`);
  console.log(`    (${accommodations.length} from this file + up to 5 hand-seeded listings`);
  console.log(`     from supabase/migrations/0003_seed_reference_data.sql, if that ran first)`);
  console.log(`  pois table: ${poiCount} rows total (source file had ${pois.length})`);
}

main().catch(err => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
