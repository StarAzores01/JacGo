/* =====================================================================
   normalize.js — maps each source's raw record shape onto the two shared
   schemas every adapter's output funnels into:

   POI:           { id, name, category, lat, lng, province, description, source, source_id, last_updated }
   Accommodation: { id, name, type, lat, lng, province, price_level, source, source_id, last_updated }

   `id` is a pipeline-internal key, deterministically derived from
   source+source_id (sha1, truncated) — stable across re-runs, but distinct
   from source_id itself so a record's provenance (source/source_id) stays
   separately inspectable for attribution/debugging.
   ===================================================================== */

const crypto = require("crypto");

const CATEGORY_MAP = {
  "tourism:attraction": "Attraction",
  "tourism:viewpoint": "Viewpoint",
  "tourism:museum": "Museum",
  "tourism:artwork": "Public Art",
  "tourism:zoo": "Zoo",
  "tourism:theme_park": "Theme Park",
  "tourism:gallery": "Gallery",
  "tourism:picnic_site": "Picnic Site",
  "tourism:camp_site": "Campsite",
  "tourism:aquarium": "Aquarium",
  "leisure:park": "Park",
  "leisure:nature_reserve": "Nature Reserve",
  "leisure:garden": "Garden",
  "leisure:beach_resort": "Beach Resort",
  "leisure:marina": "Marina",
  "leisure:golf_course": "Golf Course",
  "leisure:water_park": "Water Park",
  "natural:beach": "Beach",
  "natural:cave_entrance": "Cave",
  "natural:peak": "Peak",
  "natural:hot_spring": "Hot Spring",
  "natural:spring": "Spring",
  "waterway:waterfall": "Waterfall",
};

const TYPE_MAP = {
  hotel: "Hotel",
  guest_house: "Guest House",
  hostel: "Hostel",
  motel: "Motel",
  chalet: "Chalet",
};

function makeId(source, sourceId) {
  return crypto.createHash("sha1").update(`${source}:${sourceId}`).digest("hex").slice(0, 12);
}

function categoryFromTags(tags) {
  for (const key of ["tourism", "leisure", "natural", "waterway"]) {
    const val = tags[key];
    if (val && CATEGORY_MAP[`${key}:${val}`]) return CATEGORY_MAP[`${key}:${val}`];
  }
  if (tags.historic) {
    // historic=* is kept broad (any value) — title-case whatever value is present
    return `Historic ${tags.historic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`;
  }
  // Fallback so nothing silently vanishes if a tag combination wasn't anticipated
  for (const key of ["tourism", "leisure", "natural", "waterway"]) {
    if (tags[key]) return `${key}:${tags[key]}`;
  }
  return "Uncategorized";
}

function normalizePoi(raw) {
  const source = "osm";
  const sourceId = `${raw.osmType}/${raw.osmId}`;
  return {
    id: makeId(source, sourceId),
    name: raw.name,
    category: categoryFromTags(raw.tags),
    lat: raw.lat,
    lng: raw.lon,
    province: raw.province,
    description: raw.tags.description || null,
    source,
    source_id: sourceId,
    last_updated: new Date().toISOString(),
  };
}

function normalizeAccommodation(raw) {
  const source = "osm";
  const sourceId = `${raw.osmType}/${raw.osmId}`;
  return {
    id: makeId(source, sourceId),
    name: raw.name,
    type: TYPE_MAP[raw.tags.tourism] || raw.tags.tourism || "Lodging",
    lat: raw.lat,
    lng: raw.lon,
    province: raw.province,
    // OSM rarely tags a usable price signal for lodging — left null here on
    // purpose; this is exactly what the Google Places / Booking adapters
    // (once implemented) are meant to fill in.
    price_level: null,
    source,
    source_id: sourceId,
    last_updated: new Date().toISOString(),
  };
}

module.exports = { normalizePoi, normalizeAccommodation, makeId, categoryFromTags };
