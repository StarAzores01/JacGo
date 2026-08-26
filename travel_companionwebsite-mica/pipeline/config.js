/* =====================================================================
   config.js — pipeline-wide settings: which adapters run, and the OSM tag
   sets each one queries for. Edit this file to add/remove tags or toggle
   sources on/off — run.js just reads it, no logic lives here.
   ===================================================================== */

module.exports = {
  // Toggle adapters on/off without touching run.js. googlePlaces/booking
  // are unimplemented stubs (see adapters/google-places.js, adapters/booking.js) —
  // flip enabled:true only once you've actually filled in their API calls.
  sources: {
    overpass: { enabled: true },
    wikidata: { enabled: true }, // enrichment pass, runs after overpass+dedupe
    googlePlaces: { enabled: false },
    booking: { enabled: false },
  },

  // Curated OSM tag values for POIs — deliberately narrower than a blanket
  // tourism=*/leisure=* match, which also pulls a lot of non-touristy noise
  // (tourism=information signboards, leisure=fitness_station, leisure=pitch,
  // leisure=dog_park, etc.). This list is just an array — add values here
  // to widen coverage.
  poiTags: {
    tourism: ["attraction", "viewpoint", "museum", "artwork", "zoo", "theme_park", "gallery", "picnic_site", "camp_site", "aquarium"],
    leisure: ["park", "nature_reserve", "garden", "beach_resort", "marina", "golf_course", "water_park"],
    natural: ["beach", "cave_entrance", "peak", "hot_spring", "spring"],
    waterway: ["waterfall"],
    historicAny: true, // historic=* (any value) — heritage sites are all worth keeping
  },

  // Lodging subtypes pulled as Accommodation records instead of POIs.
  lodgingTags: {
    tourism: ["hotel", "guest_house", "hostel", "motel", "chalet"],
  },

  overpass: {
    endpoint: "https://overpass-api.de/api/interpreter",
    timeoutSeconds: 90, // polygon-area queries cost more server-side than a plain bbox
    delayBetweenProvincesMs: 3000, // be polite to the shared public instance
  },

  wikidata: {
    sparqlEndpoint: "https://query.wikidata.org/sparql",
    wikipediaSummaryEndpoint: "https://en.wikipedia.org/api/rest_v1/page/summary/",
    searchRadiusKm: 0.4,
    nameSimilarityThreshold: 0.55, // looser than dedupe's — this just filters SPARQL candidates before picking the best one
    delayBetweenRequestsMs: 300,
    maxPoisToEnrich: 200, // safety cap — enrichment is one request per POI; raise once you've checked timing
  },

  dedupe: {
    nameSimilarityThreshold: 0.82,
    distanceMeters: 150,
  },
};
