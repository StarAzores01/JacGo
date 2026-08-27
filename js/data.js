/* data.js — what's left of the JAC Go mock DB after the Supabase migration.
 *
 * Everything user-scoped or reference-data-shaped (user, users, nextTrip,
 * trips, fares, accommodation, terminals, rewards, notifications,
 * padalaHistory) now lives in Postgres — see supabase/migrations/ and
 * js/auth.js, js/interactions.js, and pages/*.html's own inline scripts
 * for the live queries that replaced each of those keys.
 *
 * What's left here is genuinely still static/demo-only:
 *   - weather: no live weather API is wired up yet. Shown on
 *     dashboard.html (fillDashboardWidgets) and weather.html.
 *   - activities: dashboard.html's "Local Activities & Dining" widget.
 *     This is the same shape pipeline/output/pois.json produces, and
 *     will eventually be replaced by the `pois` table once that pipeline
 *     import (Phase 4, per supabase/migrations/0001_init.sql) lands —
 *     not done yet, so this stays mock for now.
 *   - packingList: static app copy (a checklist), not user or reference
 *     data — there was never a real backend for this to migrate to.
 *
 * Known remaining gap: js/track-map.js (pages/track-bus.html) still reads
 * DB.trips[0] for its map widget. track-bus.html wasn't one of the pages
 * in this migration pass, so that key was removed here rather than kept
 * on its account — track-map.js already guards for DB.trips being
 * missing (`(typeof DB !== "undefined" && DB.trips && DB.trips[0]) || {}`),
 * so it degrades to a blank trip on the map instead of erroring, but it
 * will need the same live-query treatment as the other pages to actually
 * show real data.
 */

const DB = {
  weather: {
    origin:      { place: "Pasay",  temp: 30, desc: "Partly cloudy" },
    destination: { place: "Lucena", temp: 32, desc: "Sunny — pack light" },
    forecast: [
      { day: "Mon", temp: 31, ic: "sun" },
      { day: "Tue", temp: 29, ic: "cloud-sun" },
      { day: "Wed", temp: 28, ic: "cloud-sun-rain" },
      { day: "Thu", temp: 30, ic: "sun" },
      { day: "Fri", temp: 31, ic: "sun" },
    ],
  },

  /* Activities near the upcoming destination (OSM/Wikipedia sourced where noted) */
  activities: [
    { name: "Pagsanjan Falls",    type: "Activity", loc: "Cavinti, Laguna",          desc: "One of the Philippines' most famous waterfalls — reached by a dramatic boat ride through the gorge.", source: "osm+wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/Pagsanjan_Falls" },
    { name: "National Arts Center", type: "Activity", loc: "Mount Makiling, Los Baños, Laguna", desc: "Arts complex and residency campus on the slopes of Mount Makiling.", source: "osm+wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/National_Arts_Center" },
    { name: "Buddy's Lucena",     type: "Dining",   loc: "Lucena, Quezon",           desc: "All-day Filipino comfort food, a local favorite since the '80s." },
  ],

  /* Packing checklist rendered on Trip Planner */
  packingList: [
    {
      category: "Clothing",
      items: ["Light, breathable clothing", "Extra shirt for the return trip", "Light jacket for aircon buses"],
    },
    {
      category: "Documents",
      items: ["Valid ID", "QR e-ticket / booking confirmation", "Hotel booking confirmation (if any)"],
    },
    {
      category: "Essentials",
      items: ["Sunscreen & cap", "Reusable water bottle", "Padala form (if shipping pasalubong home)", "Power bank"],
    },
  ],
};
