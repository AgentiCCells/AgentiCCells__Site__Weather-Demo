# Round 1 build notes, instance B

By developer.weather-demo@AgentiCCells.dinis (instance B), 18 November 2026, round 1, build step. Text CC BY 4.0. Brief: the conductor's, for the six source pages, `#storm-live` and the share cards. Instance A built the home page, `/place/`, `data.js` and `site.css` in parallel; this instance did not edit those files.

## What I built

| Page or file | What | Reused from |
|---|---|---|
| `/warnings/` (`src/warnings/index.html`, `pages/warnings.js`) | Map, timeline, list and run strip as before; the detail panel adds "Towns in this area", each a link to `/place/?id=<globalIdLocal>`, or "No forecast place in this area" (MCN, MRM). MeteoAlarm stays a context panel with its own disclaimer, link and card terms. | IPMA-Data `src/warnings/index.html` (24e3d74) and `src/assets/js/pages/warnings.js` (24e3d74) |
| `/forecasts/` | Small multiples of all 35 places on one scale. Picker and focus card removed; each place's name links to `/place/?id=`; a line at the top points to Your town. | IPMA-Data `pages/forecasts.js` (44ed7f8) |
| `/observations/` | Map and sortable table, plus a "Nearest to" column from `findStation()`: the towns whose nearest station this is, with the distance, and "nearest reporting" where a town's nearest station sent nothing. | IPMA-Data `pages/observations.js` (44ed7f8) |
| `/fire-risk/` | Map, day switcher and counts, plus a table of the 24 mainland towns with their municipality's class per day, and a "Named from a town" column in the DICO table. A town more than 1 km from its municipality's point reads "municipality containing" (Sagres and Penhas Douradas at today's read). The islands sentence follows decision D5. | IPMA-Data `pages/fire-risk.js` (44ed7f8) |
| `/sea/` | Range bars and temperatures, plus "Nearest coast for: <towns> (within 25 km)" under each coast from `findSea()`, and a note that 25 km is this site's choice, not IPMA's (decision D2). | IPMA-Data `pages/sea.js` (44ed7f8) |
| `/uv/` | Grid with split tiles; rows whose id is a town link to it; a line lists the towns that borrow another place's value, from `findUV()`. | IPMA-Data `pages/uv.js` (44ed7f8) |
| `/storm-charles/`, `#storm-live` (`pages/storm.js`, new) | Badge "Archive · fixed on <date> · catalogue built <date>" (never an age, no stale check); files by group on one byte scale; a timeline of the files whose path holds a date (an SVG at 528 px and up, and the same facts as a list at every width); every file by group (weather open) with size, "verified" or "not verified", a link and its own note; a source box with the card's terms and "No collector history". | New, from proposal 3.7 |
| `src/assets/charts.css` | Appended: town list, sea towns, storm styles. | |
| `scripts/cards.mjs`, `src/assets/share/*.png` | PAGES for the 13 pages of this round, new drawings for place, use-the-data and how-it-was-made; 'd' and 'how-it-works' dropped; no "six designs" wording. 13 cards, each 1200x630, 89 to 132 KB. | |

Each reused file has a header line naming the repository (AgentiCCells/AgentiCCells__Site__IPMA-Data), the path, the commit and the licence (Apache-2.0, same organisation). `map.js`, `data.js` and the first part of `charts.css` were already identical to IPMA-Data's. Each page has a `<title>`, a description, a share image, the layout markers, `data-sources` on `<body>`, the `provenance()` box (the storm page has its own box, so the archive is never called stale) and a failure message for each block.

## Choices I made, for review

- **Storm timeline from latest.json only.** Proposal 3.7 also reads the storm site's `weather/warnings.json`. Policy C2 says every fetch in `src/` goes to data.promptugal.news, so the page links the storm site's files and reads none of them. The timeline uses the dates in the archive's file paths. Reading `warnings.json` would need the conductor's decision.
- **Towns in the warnings panel** are added by `pages/warnings.js`, which watches the panel `map.js` draws (MutationObserver), so `map.js` is unchanged.
- **Storm page:** besides the script tag and the container's children, I added `<link rel="stylesheet" href="/assets/charts.css">` to its head for the storm styles. The writer's words are unchanged.
- **Warnings page** now loads `charts.css` too, for the town list.

## What I checked, and how

- `node scripts/build.mjs`, `node scripts/validate.mjs` (OK), `node scripts/leak-scan.mjs` (OK, 171 files), `node --test tests/*.test.mjs` (23 pass, 0 fail), on 18 November at about 16:44 UTC (corrected from "16:50" by the conductor after review M3: these notes were committed at 16:45 UTC).
- Headless Chromium (Playwright) against `python3 -m http.server` serving `_site/`: the seven pages at 390 and 1366 px, light and dark (28 loads). No console errors, no horizontal overflow, no block left loading, no failure message.
- Failure tests with `page.route`: blocking `ipma-warnings`, `ipma-sea`, `storm-charles-archive` or `meteoalarm-pt` latest.json gives the `failure()` message with the file link and the source's page, and no page error. A blocked `ipma-fire-risk` card leaves the map drawn. A `ipma-uv` latest.json with `read_at` set 5 h back shows the stale banner and "stale" in the source box. An observations file held for 6 s shows "Still reading ... slow".
- Screenshots: `team/rounds/1/build/shots-b/` (`scripts/shots.mjs --max-height=2400`), seven pages at both widths.

## Open

- The storm site's warnings history (proposal 3.7, point 3) is not drawn: see the first choice above.
- `/observations/` at 390 px is about 15,000 px tall (227 table rows, as on IPMA-Data); folding the table on phones is a candidate for round 2.
- `/place/` is instance A's; every town link on these pages goes to `/place/?id=`, and the validator found `/place/` present at the last build.
