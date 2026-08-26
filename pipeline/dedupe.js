/* =====================================================================
   dedupe.js — collapses near-duplicate records within a normalized list
   (OSM nodes/ways that map to the same real-world place, or later,
   overlap between OSM and a second source once one is added). Two records
   are treated as duplicates when BOTH:
     - name similarity >= config.dedupe.nameSimilarityThreshold
     - great-circle distance <= config.dedupe.distanceMeters

   Both conditions matter: name alone would wrongly merge two different
   "City Park"s in different towns; distance alone would wrongly merge a
   hotel and the restaurant next door to it.
   ===================================================================== */

const config = require("./config");

function normalizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a, b) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

// Haversine distance in meters
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isDuplicate(a, b) {
  if (a.province !== b.province) return false; // provinces don't overlap in this pipeline's bboxes closely enough to matter
  const dist = distanceMeters(a.lat, a.lng, b.lat, b.lng);
  if (dist > config.dedupe.distanceMeters) return false;
  return nameSimilarity(a.name, b.name) >= config.dedupe.nameSimilarityThreshold;
}

// Merges b's non-null fields into a where a's are missing, so a
// Wikidata-enriched duplicate doesn't lose its description to a plainer one.
function mergeRecords(a, b) {
  const merged = { ...a };
  for (const key of Object.keys(b)) {
    if ((merged[key] === null || merged[key] === undefined) && b[key] != null) {
      merged[key] = b[key];
    }
  }
  return merged;
}

function dedupeWithinProvince(records) {
  const kept = [];
  for (const record of records) {
    const dupIndex = kept.findIndex(existing => isDuplicate(existing, record));
    if (dupIndex === -1) {
      kept.push(record);
    } else {
      kept[dupIndex] = mergeRecords(kept[dupIndex], record);
    }
  }
  return kept;
}

// Duplicates never span provinces (isDuplicate() already short-circuits on
// province mismatch), so bucketing first turns one O(n²) scan over every
// record into several much smaller ones — matters once total record counts
// climb into the thousands (a single big province alone can be 1000+).
function dedupeList(records) {
  const byProvince = new Map();
  for (const record of records) {
    if (!byProvince.has(record.province)) byProvince.set(record.province, []);
    byProvince.get(record.province).push(record);
  }
  const result = [];
  for (const bucket of byProvince.values()) {
    result.push(...dedupeWithinProvince(bucket));
  }
  return result;
}

module.exports = { dedupeList, isDuplicate, nameSimilarity, distanceMeters };
