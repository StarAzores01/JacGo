# JAC Go data pipeline

Offline data-ingestion tool that pulls points-of-interest and accommodation
listings for JAC Liner's core corridor (Laguna, Batangas, Quezon,
Marinduque), normalizes them onto two shared schemas, dedupes overlap
between sources, and exports static JSON.

**This is not part of the shipped website.** `jacgo-site` itself stays a
100% static site with no server of its own — its data now lives in
Supabase (see `supabase/migrations/`), and this pipeline's output
(`pipeline/output/*.json`) is what `load-to-supabase.js` loads into the
`accommodation`/`pois` tables there. See "Getting the output into the
site" below.

## Running it

```bash
cd pipeline
node run.js
```

No `npm install` needed to generate output — `run.js` only uses Node's
built-in `fetch` (Node 18+). `load-to-supabase.js` (loading that output
into Supabase) is the one exception — it depends on
`@supabase/supabase-js`, so `npm install` is needed before running *that*
script specifically; see "Getting the output into the site" below.

A full run across all four provinces takes several minutes, mostly spent in
the deliberately-rate-limited Wikidata enrichment pass (one request pair —
SPARQL lookup + Wikipedia summary — per POI, with a delay between each).

Output lands in `pipeline/output/pois.json` and
`pipeline/output/accommodations.json`. Re-running is safe and idempotent —
each record's `id` is a deterministic hash of its source + source ID, so
re-runs don't renumber anything.

## Architecture

One adapter per source, all normalizing onto the same two schemas:

```
provinces.js          — bounding boxes (queried from Nominatim, not guessed — see file header)
config.js              — which sources are on/off, OSM tag lists, thresholds
adapters/overpass.js   — OSM POIs + lodging via Overpass API      [implemented, live]
adapters/wikidata.js   — enrichment: description + Wikipedia link  [implemented, live]
adapters/google-places.js — richer POI/lodging data                [stub — needs API key]
adapters/booking.js    — live hotel pricing/availability            [stub — needs partner approval]
normalize.js           — maps each adapter's raw shape onto the shared schemas
dedupe.js               — collapses near-duplicate records (name similarity + geo-distance)
run.js                  — orchestrator: reads config.js, calls enabled adapters, writes output/
```

To add a new source: write `adapters/<name>.js` exporting
`fetchProvince(bbox, provinceKey) -> { pois, lodging }` (matching
`adapters/overpass.js`'s shape), add a `config.sources.<name>` toggle, and
wire it into `run.js`'s pattern for `googlePlaces`/`booking`. Its raw
records just need to reach `normalizePoi()`/`normalizeAccommodation()`.

## Schemas

**POI**: `id, name, category, lat, lng, province, description, source, source_id, last_updated`
**Accommodation**: `id, name, type, lat, lng, province, price_level, source, source_id, last_updated`

`id` is pipeline-internal (a short hash of `source:source_id`), kept
separate from `source`/`source_id` so provenance stays inspectable —
important given the attribution requirements below.

## Sources: rate limits & attribution

| Source | Status | Rate limit / usage policy | Attribution requirement |
|---|---|---|---|
| **Overpass API** (overpass-api.de) | Implemented | No hard published req/sec cap, but fair-use expects spacing between heavy queries and ≤2 concurrent requests. This adapter runs provinces sequentially with a 2s delay between each (`config.overpass.delayBetweenProvincesMs`). If you're running this often, consider a self-hosted Overpass instance instead of hammering the shared public one. | **Required.** OSM data is © OpenStreetMap contributors, licensed **ODbL**. The site's UI must show a visible "© OpenStreetMap contributors" credit linking to openstreetmap.org/copyright wherever this data is displayed — not just in this README. |
| **Wikidata Query Service** (query.wikidata.org) | Implemented | Expects a descriptive `User-Agent` (this adapter sends one) and reasonable request spacing — no hard published limit, but this adapter runs sequentially with a 300ms delay (`config.wikidata.delayBetweenRequestsMs`) and caps enrichment at `config.wikidata.maxPoisToEnrich` (200 by default) as a safety valve. | Wikidata content is **CC0** — no legal attribution requirement, but crediting it is good practice. |
| **Wikipedia REST API** (en.wikipedia.org/api/rest_v1) | Implemented | Generous rate limit for the summary endpoint; no special handling needed beyond a real User-Agent. | **Required.** Article extracts are **CC-BY-SA** — any description sourced from Wikipedia needs a visible "Wikipedia" credit + link to the source article (`wikipedia_url` field is carried through specifically so the UI can link out). Don't strip this attribution. |
| **Google Places API (New)** | Stub only, not called | Free tier ≈ $200/mo credit, paid beyond. Once implemented: re-check Google's ToS on caching before storing results — Places data has limited allowed cache duration unless you're on a storage-enabled pricing tier. | Google's attribution requirements (varies by display context — check current Maps Platform ToS before shipping). |
| **Booking.com / Agoda partner APIs** | Stub only, not called | Requires affiliate/partner approval (application process, budget for a wait). | Per affiliate agreement terms once approved — typically requires live pricing display, not cached snapshots. |
| **Airbnb** | Not implemented, not planned | No public API for general developers. | — Don't scrape; skip or link out only. |
| **TripAdvisor Content API** | Not implemented | Official API, application required, free tier limited. | Per TripAdvisor's API terms once approved. |

**Do not scrape Booking.com, Agoda, Airbnb, or TripAdvisor** — all four
explicitly prohibit it in their Terms of Service. Their stub adapters exist
so the pipeline's shape is ready for the *official* partner APIs once
you're approved, not as an invitation to scrape instead.

## Getting the output into the site

This pipeline deliberately stops at writing JSON — it doesn't touch
Supabase or `jacgo-site`'s HTML/CSS/JS itself. To actually use the data:

1. Review `pipeline/output/pois.json` / `accommodations.json` — this is
   real, un-curated OSM data; expect to spot-check before shipping it
   (a handful of odd tag combinations or unhelpful names are normal).
2. Load it into Supabase:
   ```bash
   cd pipeline
   npm install   # first time only — pulls in @supabase/supabase-js
   SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
   node load-to-supabase.js
   ```
   This upserts into the `accommodation`/`pois` tables (schema:
   `supabase/migrations/0001_init.sql`), keyed on each record's pipeline
   `id` — safe to re-run after a fresh `run.js` pass, it updates existing
   rows instead of duplicating them. See the comment at the top of
   `load-to-supabase.js` for the full explanation and where to find both
   env var values (Supabase dashboard -> Project Settings -> API — the
   service_role key, not the anon key this script never uses).
3. Add the OSM/Wikipedia attribution credit somewhere visible in the UI
   (a footer line is enough) — this isn't optional per the licenses above.
4. For Marinduque and rural Quezon specifically: OSM coverage is real but
   uneven (see the raw output) — LGU/provincial tourism office pages are
   still the better source there regardless of pipeline quality, per the
   original sourcing research this pipeline is based on.

## Known limitations (MVP scope)

- `dedupe.js` compares every new record against every already-kept one
  within a province (O(n²)) — fine at this pipeline's current scale
  (low thousands of records), would need a spatial index if provinces or
  tag coverage grow a lot.
- Wikidata enrichment is one POI at a time, not batched — correct but slow
  for large POI counts; a true SPARQL batch query would be faster if
  `maxPoisToEnrich` ever needs to go much higher.
- `price_level` on OSM-sourced accommodations is always `null` — OSM
  doesn't reliably tag pricing. That's what the Google Places/Booking
  adapters are for.
