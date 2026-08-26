/* =====================================================================
   run.js — pipeline orchestrator. Reads config.js for which sources are
   enabled, pulls from each, normalizes everything onto the shared
   POI/Accommodation schemas, dedupes, enriches, and writes static JSON
   to pipeline/output/. Re-run this whenever you want fresh data — it's
   idempotent (record `id`s are deterministic, see normalize.js).

   Usage: node run.js   (or: npm run run)
   ===================================================================== */

const fs = require("fs");
const path = require("path");

const config = require("./config");
const provinces = require("./provinces");
const overpass = require("./adapters/overpass");
const wikidata = require("./adapters/wikidata");
const { normalizePoi, normalizeAccommodation } = require("./normalize");
const { dedupeList } = require("./dedupe");

async function run() {
  const startedAt = Date.now();
  let rawPois = [];
  let rawLodging = [];

  if (config.sources.overpass.enabled) {
    console.log("=== Overpass (OpenStreetMap) ===");
    const { pois, lodging } = await overpass.fetchAllProvinces(provinces);
    rawPois = pois;
    rawLodging = lodging;
  } else {
    console.log("=== Overpass: disabled in config.js, skipping ===");
  }

  if (config.sources.googlePlaces.enabled) {
    // Adapter is a stub — flipping this on without implementing it first
    // will throw. See adapters/google-places.js.
    console.log("=== Google Places ===");
    const googlePlaces = require("./adapters/google-places");
    for (const [key, bbox] of Object.entries(provinces)) {
      const { pois, lodging } = await googlePlaces.fetchProvince(bbox, key);
      rawPois.push(...pois);
      rawLodging.push(...lodging);
    }
  }

  if (config.sources.booking.enabled) {
    // Adapter is a stub — see adapters/booking.js.
    console.log("=== Booking/Agoda ===");
    const booking = require("./adapters/booking");
    for (const [key, bbox] of Object.entries(provinces)) {
      const { lodging } = await booking.fetchProvince(bbox, key);
      rawLodging.push(...lodging);
    }
  }

  console.log(`\nNormalizing ${rawPois.length} POIs and ${rawLodging.length} accommodations...`);
  let pois = rawPois.map(normalizePoi);
  let accommodations = rawLodging.map(normalizeAccommodation);

  console.log("Deduplicating...");
  const poisBefore = pois.length;
  const accommodationsBefore = accommodations.length;
  pois = dedupeList(pois);
  accommodations = dedupeList(accommodations);
  console.log(`  POIs: ${poisBefore} -> ${pois.length} (${poisBefore - pois.length} merged)`);
  console.log(`  Accommodations: ${accommodationsBefore} -> ${accommodations.length} (${accommodationsBefore - accommodations.length} merged)`);

  if (config.sources.wikidata.enabled) {
    console.log("\n=== Wikidata/Wikipedia enrichment ===");
    pois = await wikidata.enrichAll(pois);
  }

  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "pois.json"), JSON.stringify(pois, null, 2));
  fs.writeFileSync(path.join(outputDir, "accommodations.json"), JSON.stringify(accommodations, null, 2));

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nDone in ${seconds}s. Wrote:`);
  console.log(`  pipeline/output/pois.json (${pois.length} records)`);
  console.log(`  pipeline/output/accommodations.json (${accommodations.length} records)`);
}

run().catch(err => {
  console.error("\nPipeline failed:", err);
  process.exit(1);
});
