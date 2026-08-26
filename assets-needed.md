# Images needed — JAC Go

Every `<img>` added across the site points to `/assets/images/[name].jpg`, so
create that folder at the project root (`jacgo-site/assets/images/`) and drop
files in using the exact filenames below — no code changes needed once
they're in place, since the `src` paths already match.

All 13 are free to source from [Unsplash](https://unsplash.com) or
[Pexels](https://pexels.com); both licenses allow commercial use without
attribution, but crediting the photographer in a `credits.md` is good
practice if this ever ships for real. Search terms are suggestions, not
literal titles to search verbatim.

**Note on the path:** `/assets/images/...` (leading slash) only resolves
correctly when the site is served from a local/real web server — the
`python3 -m http.server` option in the README, or any real host. If you
open `index.html`/`pages/*.html` directly via `file://` (the README's
"just open it" option), a root-absolute path won't resolve to the project
folder and the images will 404. Switch to relative paths (`../assets/...`
from `pages/`, `assets/...` from the root) if you need the double-click
workflow to keep working.

---

## Popular Destinations — `index.html`, "Popular destinations" section

Cards are 220px wide × 140px tall (170px wide on mobile) — suggest **3:2
landscape** source photos; `object-fit: cover` handles the exact crop.

| Filename | Subject | Card |
|---|---|---|
| `calamba-hotsprings.jpg` | Hot spring resort pools, Calamba/Pansol, Laguna | Calamba Hot Springs |
| `lucena-quezon-gateway.jpg` | Lucena City street or downtown scene, Quezon province | Lucena City |
| `anilao-batangas-dive.jpg` | Anilao coastline or dive cove, Batangas | Anilao |
| `marinduque-moriones.jpg` | Marinduque island coastline, or Moriones Festival mask imagery | Marinduque |
| `lucban-pahiyas.jpg` | Lucban town during Pahiyas festival — colorful kiping decorations | Lucban |
| `tayabas-heritage.jpg` | Tayabas heritage church/Spanish-era plaza, Quezon | Tayabas |

## Accommodation — `pages/accommodation.html`

Cards are `.photo-card` thumbnails, 120px tall, in a 3-column grid — suggest
**16:9 landscape** source photos.

| Filename | Subject | Card |
|---|---|---|
| `terrazza-inn-lucena.jpg` | Small hotel/inn exterior, tropical Philippine setting | Terrazza Inn Lucena |
| `batangas-bay-hotel.jpg` | Hotel exterior near a bay or port | Batangas Bay Hotel |
| `calamba-garden-suites.jpg` | Garden-style hotel/suites exterior | Calamba Garden Suites |
| `raylux-hotel-lucena.jpg` | Real listing (OSM) — hotel exterior, Lucena, Quezon | RAYLux Hotel |
| `hotel-oliva-88-calamba.jpg` | Real listing (OSM) — hotel exterior, Calamba, Laguna | Hotel Oliva 88 |

## Terminals — `pages/terminals.html`

Cards are `.photo-card` thumbnails, 120px tall, in a 2-column grid — suggest
**16:9 landscape** source photos.

| Filename | Subject | Card |
|---|---|---|
| `pasay-buendia-terminal.jpg` | Bus terminal building/facade, urban Metro Manila | Pasay (Buendia) Terminal |
| `cubao-terminal.jpg` | Bus terminal building/facade, Cubao, Quezon City | Cubao Terminal |
| `calamba-terminal.jpg` | Bus terminal building/facade, Calamba, Laguna | Calamba Terminal |
| `lucena-grand-central-terminal.jpg` | Large bus terminal building, Lucena, Quezon | Lucena Grand Central Terminal |

---

## Not yet covered

The dashboard's "Local Activities & Dining" widget (`pages/dashboard.html`)
also represents real places (Pagsanjan Falls and National Arts Center are
real, pipeline-sourced; Kamayan sa Palaisdaan and Buddy's Lucena are still
editorial/curated) but renders as text rows inside a single card, not
individual photo cards — it wasn't in scope for this pass. If you want
thumbnails there too, that widget would need a small layout change first
(each row would need its own image slot).
