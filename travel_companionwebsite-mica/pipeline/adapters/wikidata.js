/* =====================================================================
   adapters/wikidata.js — enrichment pass. For each POI, looks up nearby
   Wikidata items (geo + name match) and pulls a short description from
   the matching English Wikipedia article, if any.

   Rate limits / usage policy: Wikidata Query Service (query.wikidata.org)
   asks for a descriptive User-Agent identifying your tool + contact info,
   and has a default per-query timeout (~60s) — no hard published
   requests/sec limit, but sequential + a small delay between requests
   (config.wikidata.delayBetweenRequestsMs) is expected good practice
   rather than firing requests concurrently. Wikipedia's REST API
   (en.wikipedia.org/api/rest_v1) has its own separate, generous rate limit
   for the summary endpoint.

   Attribution: Wikidata content is CC0 (no attribution legally required,
   but crediting it is good practice); Wikipedia article text is CC-BY-SA —
   a UI showing Wikipedia-derived descriptions must credit "Wikipedia" and
   link to the source article, and can't strip that attribution.
   ===================================================================== */

const config = require("../config");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Same similarity function as dedupe.js uses — duplicated on purpose to
// keep each adapter self-contained; see dedupe.js if you want to unify them.
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
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

function buildSparql(lat, lon) {
  const radiusKm = config.wikidata.searchRadiusKm;
  return `
SELECT ?item ?itemLabel ?article WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?location .
    bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
  }
  OPTIONAL {
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 8`;
}

async function queryWikidataCandidates(lat, lon) {
  const url = `${config.wikidata.sparqlEndpoint}?query=${encodeURIComponent(buildSparql(lat, lon))}&format=json`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/sparql-results+json",
      "User-Agent": "jacgo-site-pipeline/0.1 (offline data-prep script; not shipped to browsers)",
    },
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.results?.bindings || []).map(b => ({
    label: b.itemLabel?.value,
    wikipediaUrl: b.article?.value || null,
  }));
}

async function fetchWikipediaSummary(wikipediaUrl) {
  const title = decodeURIComponent(wikipediaUrl.split("/wiki/")[1] || "");
  if (!title) return null;
  const res = await fetch(`${config.wikidata.wikipediaSummaryEndpoint}${encodeURIComponent(title)}`, {
    headers: { "User-Agent": "jacgo-site-pipeline/0.1 (offline data-prep script; not shipped to browsers)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.extract || null;
}

async function enrichOne(poi) {
  try {
    const candidates = await queryWikidataCandidates(poi.lat, poi.lng);
    const best = candidates
      .filter(c => c.label)
      .map(c => ({ ...c, score: nameSimilarity(poi.name, c.label) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < config.wikidata.nameSimilarityThreshold) return poi;

    let description = null;
    let wikipediaUrl = best.wikipediaUrl;
    if (wikipediaUrl) {
      description = await fetchWikipediaSummary(wikipediaUrl);
    }

    return {
      ...poi,
      description: description || poi.description,
      wikipedia_url: wikipediaUrl,
      enrichment_source: description ? "wikidata+wikipedia" : "wikidata",
    };
  } catch (err) {
    console.warn(`  [wikidata] enrichment failed for "${poi.name}": ${err.message}`);
    return poi;
  }
}

async function enrichAll(pois) {
  const cap = Math.min(pois.length, config.wikidata.maxPoisToEnrich);
  if (cap < pois.length) {
    console.log(`  [wikidata] enriching first ${cap} of ${pois.length} POIs (config.wikidata.maxPoisToEnrich cap — raise it once you've checked timing)`);
  }
  const enriched = [];
  for (let i = 0; i < pois.length; i++) {
    if (i < cap) {
      enriched.push(await enrichOne(pois[i]));
      await sleep(config.wikidata.delayBetweenRequestsMs);
      if ((i + 1) % 20 === 0) console.log(`  [wikidata] ${i + 1}/${cap} done`);
    } else {
      enriched.push(pois[i]); // beyond the cap — left un-enriched, not dropped
    }
  }
  return enriched;
}

module.exports = { enrichAll, enrichOne, queryWikidataCandidates, nameSimilarity };
