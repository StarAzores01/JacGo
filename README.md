# JAC Go — Full Front-End Website Structure

A complete, multi-page vanilla HTML/CSS/JS website (no build tools, no framework)
implementing every screen from the project brief, plus a public marketing
homepage that introduces the product before a passenger enters the dashboard.

## File structure

```
jacgo-site/
├── index.html            → public marketing homepage (hero, features, fare preview, CTA)
├── favicon.svg            → JAC Go brand mark, used as the site favicon
├── manifest.json          → web app manifest (installable "app-like" touch)
├── robots.txt
├── css/
│   ├── base.css            → design tokens (color/type/spacing), reset, buttons, forms, tables
│   ├── layout.css          → app shell: sidebar, topbar, mobile tab bar, responsive grid
│   ├── components.css      → cards, the split-flap signature board, tickets, map, toasts
│   └── landing.css         → homepage-only styles: hero, feature grid, CTA band, footer
├── js/
│   ├── data.js              → mock "API" data (trips, fares, weather, terminals, rewards…)
│   ├── nav.js                → shared app-page chrome: active nav highlight, lang toggle, points
│   └── interactions.js        → per-page behavior: flap-board fill/animate, forms, redeem buttons
└── pages/
    ├── dashboard.html         → home: split-flap next-trip board, quick actions, widgets
    ├── trip-planner.html      → route/date search, packing list, saved itineraries
    ├── tickets.html            → upcoming (QR e-ticket) + past trips
    ├── track-bus.html           → live map placeholder, ETA, distance remaining
    ├── weather.html               → origin/destination temp + 5-day forecast
    ├── accommodation.html          → partner hotel cards near terminals
    ├── fares.html                   → full fare table by route and class
    ├── padala.html                   → cargo pickup quote form + package tracking
    ├── rewards.html                    → Alagang JAC points balance + redemption catalog
    ├── terminals.html                   → all terminals with address, tags, directions
    ├── notifications.html                → alerts, advisories, promos
    └── profile.html                       → account details + payment methods
```

## Why a real multi-page site, not a single-file SPA

Each screen is its own real `.html` file with real, crawlable content — closer to
how a production marketing-plus-app site is actually built (public site + app
pages), and easier to hand off: any page can be opened, edited, or previewed on
its own without a JS router. Shared chrome (sidebar, topbar, mobile tab bar) is
duplicated across the 12 `pages/*.html` files on purpose — that's the normal
pattern for a build-tool-free static site. If this grows further, swap that
duplication for includes via a static-site generator (11ty, Astro) or a
templating step; every page already shares the exact same markup block, so the
extraction is mechanical.

## How to run it

No build step. Two options:

1. **Just open it** — double-click `index.html`, or any file under `pages/`.
2. **Serve it** (recommended, avoids any browser file:// quirks):
   ```bash
   cd jacgo-site
   python3 -m http.server 8000
   # visit http://localhost:8000
   ```

Keep the whole folder together — `pages/*.html` reference `../css/` and `../js/`
with relative paths, so moving a page file out of `pages/` will break its styling.

## Design system recap

- **Color**: white / black / red / yellow, anchored to JAC Liner's real
  red-and-white fleet livery (red = primary actions, yellow = alerts/promos only).
- **Type**: Big Shoulders Display (condensed, signage-like) for headings, Inter
  for body copy, IBM Plex Mono for times/fares/tracking codes.
- **Signature element**: the split-flap departure board (`.flap-board` in
  `components.css`), on both the dashboard and the homepage hero — a nod to real
  bus-terminal departure signage instead of a generic stat-card hero.
- **Responsive**: sidebar collapses to a bottom tab bar under 980px; grids
  reflow from 3–4 columns down to 1–2.
- **Content**: real JAC Liner routes, fares, and terminal addresses (Pasay–Buendia,
  Cubao, Calamba, Lucena Grand Central) — no lorem ipsum.

## Extending it

- Swap the objects in `js/data.js` for real API calls — every page's script
  block reads from the same `DB` object, so that's the only file that needs to
  change to go from mock to live data.
- `track-bus.html` and `accommodation.html` use CSS placeholders for maps; swap
  in Leaflet or Google Maps JS for a production build.
- Add a real booking/checkout flow as `pages/checkout.html`, following the same
  head/content/foot pattern as the existing pages.
- Add `pages/login.html` / `pages/signup.html` if you want an auth wall before
  the dashboard — the homepage's "Open the Dashboard" CTA is the natural place
  to redirect through it.
