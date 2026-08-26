/* =====================================================================
   adapters/booking.js — STUB. Not implemented, not called by run.js
   (config.sources.booking.enabled is false by default).

   This is the realistic path to *live, bookable* accommodation data —
   real inventory, pricing, availability — which OSM/Google Places can't
   give you. Covers Booking.com and, with a near-identical shape, Agoda.

   IMPORTANT: do not scrape Booking.com, Agoda, Airbnb, or TripAdvisor.
   All four explicitly prohibit it in their Terms of Service — this isn't
   a gray area, and it risks IP/domain bans or worse. Use the official
   partner channels only:

   To implement (Booking.com):
     1. Apply via the Booking.com Partner Hub — affiliate/demand API access
        requires approval, budget for a wait before this adapter is usable.
     2. Once approved, auth per their docs (typically an API key/affiliate ID),
        query by region/coordinates for the same province bboxes this
        pipeline already defines (see ../provinces.js).
     3. Map their response fields onto the shared Accommodation schema
        (see ../normalize.js) — this is the adapter that would actually
        populate price_level, which OSM-sourced records leave null.
     4. Respect their caching/display rules — affiliate terms typically
        require live pricing, not a stale nightly snapshot.

   Agoda's affiliate program follows a similar shape (separate application,
   separate API) — if you implement both, consider splitting this into
   adapters/booking.js and adapters/agoda.js rather than merging them.

   Expected interface (match adapters/overpass.js's shape):
     async function fetchProvince(bbox, provinceKey) -> { lodging: [...] }
     (no `pois` — this source is accommodations-only)
   ===================================================================== */

async function fetchProvince(_bbox, _provinceKey) {
  throw new Error(
    "adapters/booking.js is a stub — requires Booking.com/Agoda partner approval before it can call anything. " +
    "See the file header. Should not be reachable unless config.sources.booking.enabled is set to true."
  );
}

module.exports = { fetchProvince };
