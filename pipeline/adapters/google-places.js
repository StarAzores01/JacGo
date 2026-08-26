/* =====================================================================
   adapters/google-places.js — STUB. Not implemented, not called by
   run.js (config.sources.googlePlaces.enabled is false by default).

   Fills the same gaps OSM leaves: ratings, photos, hours, and — for
   accommodations — the price_level normalize.js currently sets to null.

   To implement:
     1. Get an API key: console.cloud.google.com → enable "Places API (New)".
        Free tier: ~$200/mo credit, then paid. Set it as an env var
        (e.g. GOOGLE_PLACES_API_KEY), never commit it.
     2. Use Nearby Search (POST https://places.googleapis.com/v1/places:searchNearby)
        with a location + radius per province, or per town center if you
        want tighter coverage than a whole-province sweep.
     3. Map the response's `types` field onto the same category/type
        vocabulary normalize.js uses (CATEGORY_MAP / TYPE_MAP) so records
        from this adapter merge cleanly with OSM's via dedupe.js.
     4. IMPORTANT — re-read Google's ToS before caching: Places API data
        has limited allowed cache duration unless you're on a storage-
        enabled pricing tier. Don't just dump results into pipeline/output
        and keep them indefinitely without checking current terms.

   Expected interface (match adapters/overpass.js's shape so run.js can
   treat every source adapter interchangeably):
     async function fetchProvince(bbox, provinceKey) -> { pois: [...], lodging: [...] }
     each raw record shaped like { name, tags/rawFields, lat, lon, province }
     so it can go through the same normalize.js functions.
   ===================================================================== */

async function fetchProvince(_bbox, _provinceKey) {
  throw new Error(
    "adapters/google-places.js is a stub — see the file header for what's needed to implement it. " +
    "It should not be reachable unless config.sources.googlePlaces.enabled is set to true."
  );
}

module.exports = { fetchProvince };
