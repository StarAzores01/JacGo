/* =====================================================================
   adapters/overpass.js — OSM POI + lodging source, via the Overpass API.

   Rate limits / usage policy (overpass-api.de, the shared public instance):
   no hard published per-second cap, but its fair-use policy expects
   reasonable spacing between heavy queries and at most 2 concurrent
   requests. This adapter runs one province at a time with a delay between
   them (config.overpass.delayBetweenProvincesMs) rather than firing all four
   in parallel. If you're running this a lot, consider standing up your own
   Overpass instance (see the Overpass API wiki) instead of hammering the
   shared one.

   Attribution: OSM data is © OpenStreetMap contributors, licensed ODbL —
   any UI that displays this data needs a visible "© OpenStreetMap
   contributors" credit + link to https://www.openstreetmap.org/copyright.
   ===================================================================== */

const config = require("../config");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildQuery(province) {
  // Query by the province's real OSM polygon (area), not a bounding box —
  // see provinces.js's header for why: a bbox around an irregular province
  // shape leaks into neighboring areas (verified: ~32% of a Laguna bbox
  // query turned out to be Metro Manila landmarks).
  const areaSet = `area(${province.areaId})->.a`;
  const t = config.poiTags;
  const l = config.lodgingTags;

  const clauses = [];

  for (const v of t.tourism) clauses.push(`node["tourism"="${v}"](area.a);way["tourism"="${v}"](area.a);`);
  for (const v of t.leisure) clauses.push(`node["leisure"="${v}"](area.a);way["leisure"="${v}"](area.a);`);
  for (const v of t.natural) clauses.push(`node["natural"="${v}"](area.a);way["natural"="${v}"](area.a);`);
  for (const v of t.waterway) clauses.push(`node["waterway"="${v}"](area.a);way["waterway"="${v}"](area.a);`);
  if (t.historicAny) clauses.push(`node["historic"](area.a);way["historic"](area.a);`);

  for (const v of l.tourism) clauses.push(`node["tourism"="${v}"](area.a);way["tourism"="${v}"](area.a);`);

  return `[out:json][timeout:${config.overpass.timeoutSeconds}];
${areaSet};
(
${clauses.join("\n")}
);
out center tags;`;
}

function isLodging(tags) {
  return config.lodgingTags.tourism.includes(tags.tourism);
}

function elementCoords(el) {
  // Nodes have lat/lon directly; ways/relations need "out center" to get one.
  if (typeof el.lat === "number") return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

// Overpass's shared instance returns 429 under load even when a caller is
// behaving politely (hit this for real on the 4th province of a run that
// respected every documented delay) — worth retrying with backoff rather
// than failing the whole pipeline over a transient, expected condition.
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 4;

async function postToOverpass(query, provinceKey, attempt = 1) {
  // Overpass's Apache front-end also 406s Node's fetch() without an
  // explicit Accept header (its default content negotiation doesn't like
  // Node's) — found this the hard way testing against the live endpoint.
  const res = await fetch(config.overpass.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "*/*",
      "User-Agent": "jacgo-site-pipeline/0.1 (offline data-prep script; not shipped to browsers)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (res.ok) return res;

  if (RETRYABLE_STATUSES.has(res.status) && attempt <= MAX_RETRIES) {
    const retryAfterHeader = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : attempt * 15000; // 15s, 30s, 45s, 60s — Overpass quota slots free up on this kind of scale, not seconds
    console.log(`  [overpass] ${provinceKey}: got ${res.status}, retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`);
    await sleep(waitMs);
    return postToOverpass(query, provinceKey, attempt + 1);
  }

  throw new Error(`Overpass request failed for ${provinceKey}: ${res.status} ${res.statusText}`);
}

async function fetchProvince(province, provinceKey) {
  const query = buildQuery(province);
  const res = await postToOverpass(query, provinceKey);
  const data = await res.json();
  const pois = [];
  const lodging = [];

  for (const el of data.elements || []) {
    const coords = elementCoords(el);
    const tags = el.tags || {};
    if (!coords || !tags.name) continue; // unnamed elements aren't useful as standalone listings

    const record = {
      osmType: el.type,
      osmId: el.id,
      name: tags.name,
      tags,
      lat: coords.lat,
      lon: coords.lon,
      province: provinceKey,
    };

    if (isLodging(tags)) lodging.push(record);
    else pois.push(record);
  }

  return { pois, lodging };
}

async function fetchAllProvinces(provinces) {
  const allPois = [];
  const allLodging = [];

  for (const [key, province] of Object.entries(provinces)) {
    console.log(`  [overpass] querying ${key}...`);
    const { pois, lodging } = await fetchProvince(province, key);
    console.log(`  [overpass] ${key}: ${pois.length} POIs, ${lodging.length} lodging`);
    allPois.push(...pois);
    allLodging.push(...lodging);
    await sleep(config.overpass.delayBetweenProvincesMs);
  }

  return { pois: allPois, lodging: allLodging };
}

module.exports = { fetchProvince, fetchAllProvinces, buildQuery };
