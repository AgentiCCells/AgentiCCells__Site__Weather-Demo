# Round 2 design proposal: five designs, the chooser, and folding the long phone pages

By designer.weather-demo@AgentiCCells.dinis, 2026-11-18, round 2 (written about 17:00 to 17:40 UTC). Text CC BY 4.0. This is a proposal: the developer builds what passes review.

Built on the round 2 aim (`team/rounds/2.md`), section 6 of my round 1 proposal, what round 1 built (`team/rounds/1.md`, `src/`), the review's S8, and, as reference, the IPMA-Data cell's round 2 designs and its design review (AgentiCCells/AgentiCCells__Site__IPMA-Data, `src/d/`, `team/rounds/2/design/REVIEW.md`, Apache-2.0 for code, CC BY 4.0 for text, same organisation). Counts quoted from the live files come from my own read of `ipma-observations` and `ipma-warnings` latest.json at about 17:10 UTC (files read by the collector at 16:32 UTC: 227 stations, 168 with a reading for 15:00 UTC; 32 warning spells); they are examples, not values to copy into pages. Anything in angle brackets is a placeholder. Mock-up: `schematics.png` in this folder (the five chooser drawings of section 8, rendered in Chrome).

**What stays the same in all five** (round 1 proposal, section 6, unchanged): the disclaimer (in the header and footer, from `scripts/lib.mjs`; no design hides or restyles its wording), a provenance line (`provLine()`) beside every block, the failure, slow, stale and old states of section 4 of the round 1 proposal, warning levels as swatch plus word with their hatches, the level, RCM and UV colours from `site.css` only (never copied into a design's CSS: IPMA-Data review, must-change 5), 390 and 1366 px with no page scroll sideways, light and dark. What changes: type, surface, layout and what leads.

**One decision taken here, against the IPMA-Data cell's choice.** There, each design had one fixed theme. Here each design has a light and a dark palette and follows the reader's setting, because the data tokens in `site.css` already switch with the setting: a design that follows it gets the matching level colours for free, with nothing copied. The surface tokens of each design are given twice (section 7).

## 0. Lessons taken from the IPMA-Data cell's round 2 review

1. Never set `color` on bare `a` inside a design (`body.d-x a{...}`): it beats `.skip` and made the focused skip link ink on ink. Set `--accent` and let `site.css` colour links.
2. `h()` in `data.js` flattens one level only: use `flatMap`, never `map` returning arrays, inside `h()` calls.
3. A warnings sentence must follow every spell of a type to its true end. Reuse `warningClause()` (round 1, already fixed for this, review M1); write no new warnings sentence.
4. Level colours and hatches come from `site.css`; a design overrides only bg, panel, ink, muted, line, accent, accent-ink and, where contrast needs it, the three status words (`--fresh`, `--stale`, `--old`).
5. Wording: "one of six designs of the same data" everywhere (the chooser counts the main design).

## 1. What must be exported first: `place-blocks.js` (instance C, before any design)

The place card's block renderers live inside `src/assets/js/pages/place.js`, which runs on import (it reads `#picker` and starts six fetches), so nothing in it can be imported. Instance C moves the pure parts, unchanged in behaviour, into a new module **`src/assets/js/place-blocks.js`**, and `place.js` imports them back. `/place/` must look and behave exactly as before (C checks Lisboa 1110600, Faro 1080500 and Funchal 2310300 at 390 and 1366 px, before and after, and says so in NOTES-C).

Exports (names and signatures fixed here, so instance D can write against them in parallel):

| Export | What it is | From place.js |
|---|---|---|
| `SOURCES`, `BY_KEY` | the six sources `{ key, id, name, href, what, page }`; keys `warnings`, `forecasts`, `observations`, `sea`, `uv`, `fire` | as is |
| `STORM` | `Set` of ids with a storm archive link (Lisboa, Funchal) | as is |
| `RENDER` | `{ warnings, forecasts, observations, sea, uv, fire }`, each `(place, latestData, src) => { body: Node[], clause: string \| null, how: string }` | `rWarnings`, `rForecast`, `rStation`, `rSea`, `rUV`, `rFire` as is |
| `FAILED` | key to the summary clause when a file is not read | as is |
| `warningClause(live, now)` | the warnings sentence | as is |
| `liveSpells(place, warningsData, now = lisbonNow())` | `{ live, ended }`: the area's spells not yet ended, sorted by start, and the count already ended | new, factored out of `rWarnings` (which then calls it) |
| `forecastScale(data)` | `{ lo, hi, pct }` over all places from today, or `null` | as is |
| `readingList(reading)`, `uvTile(v)`, `rcmTile(c)`, `uvRange(band)`, `shape(what)` | small drawings and the "shape changed" result | as is |
| `loadSix({ onSlow })` | starts `loadSource()` for the six; returns `{ res, slow, loads }` (objects keyed by key; `res[key]` set when read; `onSlow(key)` called once per slow file) | `startLoads()`, without module state |
| `renderBlock(key, place, src, { slow })` | everything `fillBlock()` decides, without writing to the page: returns `{ body: Node[], prov: Node, level, outcome: { clause, how } }`, where `level` is `reading`, `slow`, `fresh`, `stale`, `old`, `unknown` or `missing`; covers loading, slow, missing (a `failure()` into a new `div`), islands fire risk, and a renderer that throws (`shape()`) | `fillBlock()` |
| `agedClause(key, clause, src)` | a clause from a stale or old file gets that file's age and state word | `aged()`, taking `src` instead of module state |
| `summaryText(place, outcomes, res)` | `"<town>: <clauses>"`, the card's summary | first lines of `finish()` |
| `howTable(place, outcomes)` | the join table (block, file, key and join) | `howTable()` without the snippet |
| `fetchSnippet(place)` | the forecast `fetch()` snippet for this town | from `howTable()` |
| `copyText(text, msgEl)` | Clipboard API, else a selected read-only field | `copyLink()`, taking the text |
| `stormLine(place)` | the storm archive paragraph, or `null` | from `buildCard()` |
| `placesFromURL(search, { min = 1, max = 1, fallback = [1110600, 1131200] })` | parses `?id=a,b` and repeated `id=`; drops unknown ids and duplicates; tops up from `fallback` to `min`; returns `{ places, unknown: [raw ids], cut: n dropped over max }` | new |
| `townSelect({ id, name = 'id', selected, exclude = [] })` | a `<select>` of the 35 towns in three `<optgroup>`s: Mainland (warning areas in `map.js` `ORDER`, north to south, then by name), Madeira, Azores; the same order as the home page's form | new |
| `setTown(ids, { push = true })` | writes `?id=` with `history.pushState` (or `replaceState`) and keeps any other parameter | new |
| `keepTown(place)` | adds `?id=<id>` to the designs control's links to the five designs, so moving between designs keeps the town | new |

`place.js` keeps its picker, card layout, `choose()`, `popstate` and storage. About 330 lines move; place.js drops to about 210.

From **`home.js`**, instance D moves the `head` functions of its `SOURCES` into a new **`src/assets/js/headlines.js`** exporting `HEADLINES` (source id to `data => string`), and `home.js` imports them back (home unchanged). Workbench uses them.

From **`data.js`**, nothing new: the designs use `loadSource`, `provLine`, `statusBand`, `termsBlock`, `sourceState`, `failure`, `fmtUTC`, `fmtDay`, `urls`, `h`. From **`map.js`**: `swatch`, `lvl`, `levelWord`, `levelsFor`, `warningWindows`, `lisbonNow`, `addDays`, `fmtPT`, `fmtSpan`, `areaName`, `ensureHatches`, `ORDER`. From **`places.js`**: `PLACES`, `placeById`, `areaOf`, the `find*` joins, `SEA_NEAR_KM`. From **`codes.js`**: `WEATHER_TYPES`, `WIND_CLASS`, `RCM_LEVELS`, `UV_BANDS`, `uvBand`.

## 2. The shape every design page shares

Each design is three files under `src/d/<slug>/`: `index.html`, `<slug>.css`, `<slug>.js`, as in the IPMA-Data cell. The page:

```html
<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><Name> | Weather, from our data</title>
<meta name="description" content="The <Name> design: <line> Read live from data.promptugal.news. Not a warning service.">
<meta name="share-image" content="/assets/share/d-<slug>.png">
<!--HEAD-->
<link rel="stylesheet" href="/d/<slug>/<slug>.css">
</head>
<body class="d-<slug>" data-sources="ipma-warnings ipma-city-forecasts ipma-observations ipma-sea ipma-uv ipma-fire-risk">
<!--HEADER-->
<main id="main">
<p class="d-kicker"><a href="/d/">Designs</a> · <Name>, one of six designs of the same data</p>
<noscript><p class="status fail">This design reads the data live in your browser and needs JavaScript. Without it, see <a href="/place/">Your town</a> (its list of towns works without JavaScript) or the files on <a href="https://data.promptugal.news/api/v1/">data.promptugal.news</a>.</p></noscript>
<div id="d-root"><p class="status loading">Reading the six files from data.promptugal.news...</p></div>
<p class="d-back"><a href="/d/">All six designs</a> · <a href="/place/">The same town in the main design</a></p>
</main>
<!--FOOTER-->
<script type="module" src="/d/<slug>/<slug>.js"></script>
</body>
</html>
```

The "same town in the main design" link is rewritten by the script to `/place/?id=<id>` once the town is known. Each design's script starts with `loadSix()`, draws its frame for the town at once (every block in its loading state), and redraws a block as its file arrives; one file missing never blanks the page. A town change needs no new fetch. `document.title` becomes "<Town>, <Name> design | Weather, from our data". Focus moves to the town heading after a change, as on `/place/`.

**URL parameters, common to all.** `?id=<globalIdLocal>`. Missing: Lisboa (1110600), with no message. Unknown: Lisboa, and the line "No town has the id <raw, cut to 20 characters>; showing Lisboa." above the heading. Choosing a town calls `setTown()` (pushState); Back and Forward redraw (`popstate`). Each design adds at most one parameter of its own (below).

**Failure and stale states, common to all** (round 1 proposal, sections 1.5 and 4.2, unchanged; each design only places them):

| State | Where it shows in every design |
|---|---|
| Reading, slow | the block in its loading state at its usual height; after 4 s, "Still reading the <name> file: data.promptugal.news is slow to answer." |
| Missing | `failure()` in that block only; its summary clause becomes `FAILED[key]` |
| Stale, old | the block draws; its provLine shows the word in `--stale` or `--old`, with a 4 px left rule in that colour; its summary clause carries the age (`agedClause`) |
| Content older than the read | the renderer's own line (forecast run over 14 h; station hour over 3 h before the read) |
| Shape changed | `shape()`: "The file was read but its shape has changed..." and no value |
| Any not fresh | `statusBand()` at the top of the page names it, with a link to its block |

## 3. Postcard, `/d/postcard/`

**Leads with:** one town as a postcard. The front carries the message (the summary sentence), the warnings "stamp" for now, the warnings and the five-day forecast. The back carries the station, sea, UV, fire risk, how it was put together, and the terms. A plain button turns it over; no animation.

**Own parameter:** `side=back` opens the back first (so a link can point to the sources). The button sets it with `replaceState`.

**Front, top to bottom.** Town name (h1, serif). A date line: "<Weekday D Month YYYY>, Portugal time" from `lisbonNow()`. The status band. The message: `summaryText()` in the serif at 1.25 rem, as a `<blockquote>`-like paragraph with a left rule in `--accent` (a `<p>`, not a quote: it is our sentence). The stamp, top right: a dashed 2 px `--accent` box holding the "Now" level for the town's area from `levelsFor(active, warningWindows()[0])`: a 2 rem swatch with its hatch and the word ("Yellow" or "No warning"), and under it "warning area <name>". Below the stamp, the postmark: a circle drawn in CSS (border, `--accent`) with "read <HH:MM> UTC" of the warnings file inside, and the state word when not fresh. Then `RENDER.warnings` body (the four-cell strip and the spells) and `RENDER.forecasts` body, each with its provLine. A row of facts from the back, each a link that turns the card over to its block: "Station: <clause>", "UV: <clause>", "Fire risk: <clause>", "Sea: <clause>" (the clauses from `renderBlock().outcome.clause`, aged).

**Back.** h2 "The back of the card". Station, sea, UV and fire risk (`RENDER`) in a two by two grid at 1366, one column at 390, each with its provLine; `stormLine()`; `howTable()` and `fetchSnippet()` in a `<details>` "How this card was put together"; `termsBlock()` with `id="terms"`. An "address" block: "To: <town>, warning area <name> (<code>), forecast place <id>", with "Copy link to this card" (`copyText`).

**Turning over.** One `<button aria-controls="pc-front pc-back" aria-expanded>` above the card: "Turn over: station, sea, UV, fire risk and sources" or "Turn back to the front". The other side gets `hidden`. Without JavaScript there is nothing to turn (the noscript line shows). A link from the status band or a fact to a block on the back turns the card over and moves focus to that block's h2.

**Layout.** 1366: the card is centred, max 60 rem, `--panel` on `--bg`, 1 px `--line` border, 6 px radius, padding 2 rem; the front is a grid `minmax(0,3fr) minmax(16rem,2fr)`: message, warnings and forecast on the left; stamp, postmark and facts on the right, with a 1 px vertical rule between. 390: one column, 16 px gutters; the stamp sits beside the h1 (float right, 6.5 rem wide); facts become a list under the forecast; the forecast uses the round 1 row form below 520 px.

**Reads:** the six latest.json and card.json (`loadSix`). **Reuses:** `RENDER`, `renderBlock`, `summaryText`, `howTable`, `fetchSnippet`, `stormLine`, `copyText`, `townSelect` (the town picker sits in the card's top bar: label "Another town", the select, and a "Show" button; it calls `setTown`), `statusBand`, `termsBlock`, `levelsFor`, `warningWindows`, `swatch`. **New code:** about 150 lines of JS (front and back assembly, the stamp, the turn), 90 of CSS.

**Type:** headings and the message in `Charter, "Iowan Old Style", Georgia, serif`; everything else, and all figures, in the system sans with `font-variant-numeric: tabular-nums`.

## 4. Timetable, `/d/timetable/`

**Leads with:** time. One five-day axis (today and the next four days, Lisbon calendar days, from `lisbonNow()` and `addDays()`), every source a row on it, a "now" line, and each row's read time, so what is in force, what comes next and how old each file is share one picture.

**Rows, in this order.** (1) **Warnings**, one sub-row per warning type in the town's area: each spell from `liveSpells()` cut into the day cells it covers (start and end as Portugal-time strings, compared as strings; left and width as a share of the day's 1,440 minutes), drawn as an 8 px bar: an SVG `rect` filled with the level token and a second `rect` filled with its hatch pattern (`ensureHatches()`), and under the bar its text "Yellow, rain, 12:00 to 18:00" (0.8 rem). With no spell: "No yellow, orange or red warning in IPMA's file" across the five days. (2) **Forecast**: per day "<min> to <max> °C" over a range bar on `forecastScale()`, then "rain <n>%" and the weather in words. (3) **Sea**: when within 25 km, per day "total sea <a> to <b> m"; otherwise one sentence across the row: "No sea point within 25 km (this site's choice). Nearest: <coast>, <km> km." (4) **UV**: per day `uvTile()` plus the band word, visible. (5) **Fire risk**: per day `rcmTile()` plus "Class <n>, <name>"; islands: the islands sentence across the row. (6) **Station**: in today's cell only, at its hour: "<HH:MM> UTC: <temp> °C, <station>, <km> km" (or the silent-station sentence). Days with no value say "no value", never blank.

**Time marks.** A 2 px `--accent` vertical "now" line across all rows in today's column, labelled "now, <HH:MM> Portugal time" at the top. Each row's label cell (left) reads "<Source>", then "read <HH:MM> UTC, <age>" and the state word when not fresh, with the row's left rule in `--stale` or `--old`. When the read time falls inside the axis, a small tick (`--muted`, or the state colour) marks it on the row, with a `title`; when it falls before today, the label says "read before today: <age>".

**Provenance.** At 1366, under each source row, a full-width row (`colspan="6"`) holding its `provLine()` in 0.8 rem. At 390 (below), the day sections mix sources, so each item starts with its source's name as a link to that source's provLine in a "Sources and read times" list placed straight after the day sections, and the status band at the top names any file not fresh. This is an adaptation of "beside every block"; the reviewer decides (decision D3).

**Layout.** 1366 (760 px and wider): a real `<table>`, `<caption>` "<Town>: every source on one five-day axis", first column 10 rem (row labels as `<th scope="row">`), five day columns `<th scope="col">` "Today, Wed 18 Nov", "Thu 19 Nov"..., `table-layout: fixed`, main widened to 80 rem. Below 760 px: the table is not shown (`display:none`, so it is not read twice) and the same model is drawn as five sections, one per day (h2 "Today, Wed 18 Nov"), each a short list in row order: warnings (swatch, level, type, times), forecast, sea, UV, fire risk, and the station reading in Today only. Both views come from one model object built once per town (`{ days: [...], rows: { warnings: [...], ... } }`), so they cannot disagree.

**Own parameter:** none.

**Reads:** the six (`loadSix`). **Reuses:** `liveSpells`, `forecastScale`, `uvTile`, `rcmTile`, `renderBlock` (only for its `level` and `outcome` and the failure body of a missing row), `statusBand`, `termsBlock`, `provLine`, `findForecast`, `findSea`, `findUV`, `findFireRisk`, `findStation`, `swatch`, `levelWord`, `ensureHatches`, `lisbonNow`, `addDays`, `fmtDay`, `townSelect`, `setTown`. **New code:** about 260 lines of JS (the model, the table, the day sections), 110 of CSS. The most new code of the five.

**Type:** system sans; figures tabular.

## 5. Two towns, `/d/two-towns/`

**Leads with:** comparison. Two to four towns side by side, block by block, rows aligned, on the scales already shared by every place (forecast: `forecastScale()` over all 35; sea: all 12 coasts), so two towns compare by eye.

**Own parameter:** `?id=1110600,1131200` (two to four ids, comma-separated; repeated `id=` also accepted, so the form below works without the script joining them). Default Lisboa and Porto. Parsed with `placesFromURL(search, { min: 2, max: 4, fallback: [1110600, 1131200, 1080500] })`; fewer than two valid: topped up from the fallback, skipping towns already shown; more than four: the first four, and "Showing the first 4 towns of <n>."; unknown ids named in one line.

**Rows.** A heading row: each town's name (h2), "warning area <name>", a "Remove" button (`aria-label="Remove <town>"`, disabled at two towns) and its "Open in Your town" link. A summary row (`summaryText` per town). Then one row per block: warnings, forecast, nearest station, sea, UV, fire risk, each cell the town's `RENDER` body, and **one** provLine under the whole row (the same file serves every town: one line, not four). Then `termsBlock()`. Above the grid: "Add a town" (`townSelect` excluding the towns shown) and a "Compare" button, disabled at four.

**Alignment.** 1366: one CSS grid, `grid-template-columns: 9rem repeat(var(--n), minmax(0,1fr))`, main widened to 84 rem; each block is a set of cells on one grid row, so row heights match across towns; the label cell holds the block name (an h3) and its row's state word when not fresh; the provLine spans columns 2 to the end. Inside a cell the forecast always uses the row form (one row per day, so the same day lines up across towns): `two-towns.css` forces the round 1 below-520 px layout of `.pc-days` inside `.tw-cell`; the warnings strip keeps four cells. 390: one section per block (h3 "Forecast"), then the towns in the same order, each a sub-block with the town name (h4) and its body, then the one provLine; the heading row becomes a list of the towns with their Remove buttons. No swiping.

**Stale and failure.** Per row, as the common table says; a missing file fails the whole row once (one `failure()` spanning the cells), not once per town.

**Reads:** the six (`loadSix`), once for all towns. **Reuses:** `RENDER`, `renderBlock`, `summaryText`, `placesFromURL`, `townSelect`, `setTown`, `statusBand`, `termsBlock`, `provLine`. **New code:** about 170 lines of JS, 90 of CSS.

**Type:** system sans; figures tabular.

## 6. Workbench, `/d/workbench/`

**Leads with:** the data itself, for someone who wants to use it. Every figure shows the file and the JSON path it came from, the join that picked the record, and a "copy as fetch" beside each block. It is "Use the data" applied to one town.

**Own parameter:** none; blocks have anchors (`#wb-forecasts` and so on).

**The files panel** (first): one row per file: id, a link to `latest.json`, `card.json` and `reads.json`, read time and age with the state word, the record count (`active.length`, `cities.length`, `stations.length`, `coasts.length`, `places.length`, `municipalities.length`), and "What the file says" from `HEADLINES[id](data)`. A failed file says "not read: <reason>" in that row. The status band above it.

**Each block** (warnings, forecast, station, sea, UV, fire risk): h2 "<Block> · <source id>". A table of paths and values, figures and paths in monospace:

| Block | Rows (path = value, with a plain meaning) |
|---|---|
| Warnings | for each live spell `active[i]`: `.level`, `.type`, `.start`, `.end`; none: "`active[]` where `area == "<code>"`: no spell" |
| Forecast | `cities[i].updated`; for the first day from today `cities[i].days[j]`: `.t_min_c`, `.t_max_c`, `.rain_prob_pct`, `.weather_type` (meaning from `WEATHER_TYPES`), `.wind_dir`, `.wind_class` |
| Station | `hour_utc`; `stations[i].name`; `stations[i].reading.temp_c`, `.humidity_pct`, `.wind_kmh`, `.wind_dir_id`, `.rain_mm`, `.pressure_hpa`; the distance as "computed here, not in the file" |
| Sea | within 25 km: `coasts[i].name`, `coasts[i].days[j].sea_min_m`, `.sea_max_m`, `.waves_min_m`, `.waves_max_m`, `.sea_temp_min_c`, `.sea_temp_max_c`; otherwise the nearest coast and its distance, "computed here" |
| UV | `places[i].id`, `places[i].days[j].index` for every entry dated today (IPMA can give two) |
| Fire risk | `municipalities[i].dico`, `municipalities[i].days[j].rcm` for today and the next days; islands: "no record: IPMA publishes no fire risk class for the islands" |

`i` is the record's index in the array as read (`data.stations.indexOf(found.nearest.station)` and so on: the `find*` joins return the file's own objects), so the path is true for this read. Under the table: the join, from `renderBlock().outcome.how`; two buttons, "Copy as fetch" and "Copy as curl and jq" (`copyText`), with the result line; a `<details>` "The whole record" with `JSON.stringify(record, null, 2)` (cut at 80 lines, and said so); the provLine. Below the blocks: `termsBlock()`.

Snippets, for the forecast (the others follow the same form with their own array and key):

```js
const f = await fetch('https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json').then(r => r.json());
const town = f.cities.find(c => c.id === 1110600); // Lisboa
console.log(f.read_at, town.days[0].t_min_c, town.days[0].t_max_c);
```

```sh
curl -s https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json | jq '.read_at, (.cities[] | select(.id == 1110600) | .days[0])'
```

Station, sea, UV (when not exact) and fire (when matched by point) are joins by distance, not by key: their snippet says so in a comment and links `places.js` instead of pretending a `find()` by id gives the same record. D runs every snippet once against the live files and records the result in NOTES-D, as round 1 did for "Use the data".

**Layout.** 1366: two columns, the files panel 22 rem on the left (sticky, scrolling on its own), the blocks on the right (max 52 rem). 390: one column; the files panel becomes a `<details>` (closed, summary "The six files: <n> read, <n> not fresh") after the status band; the path tables use the existing `table.stack` (path on one line, value under it), with `overflow-wrap: anywhere` on paths; the two copy buttons full width.

**Reads:** the six (`loadSix`). **Reuses:** `renderBlock` (state and `how`), `HEADLINES`, the `find*` joins, `copyText`, `statusBand`, `termsBlock`, `provLine`, `urls`, `townSelect`, `setTown`, `WEATHER_TYPES`, `RCM_LEVELS`, `uvBand`. **New code:** about 230 lines of JS, 80 of CSS.

**Type:** headings and prose in the system sans; every figure, path and snippet in `ui-monospace, SFMono-Regular, Menlo, monospace`.

## 7. Large print, `/d/large-print/`

**Leads with:** reading. A 22 px base, one column, the place card as short sentences, every chart replaced by a table, AAA contrast (7:1) for all text, and 48 px targets. For readers with low vision, or outdoors on a phone.

**Own parameter:** none.

**Order.** h1 town. The status band. "In short": the summary as separate sentences, one per paragraph (the clauses of `summaryText`, each its own `<p>`). Then h2 sections: **Warnings**: the four windows as a two-column table (When, Level: swatch 1.2 em with hatch, and the word), then each live spell as a sentence: "Yellow warning for rain, from Wednesday 18 November 12:00 to 18:00, Portugal time." and IPMA's text in a `<details lang="pt">`. **Forecast**: a table (Day, Lowest, Highest, Chance of rain, Weather, Wind), no bars. **Nearest station**: the sentence and `readingList()`. **Sea**: a table (Day, Total sea, Swell, Sea temperature) or the "no sea point within 25 km" sentence. **UV**: "Today: <value>, <band>." in words, then the next days as a list of sentences; no tiles. **Fire risk**: sentences "Today: class <n>, <name>." with `rcmTile()` beside the words. `stormLine()`. Terms. Each section ends with its provLine at 0.9 em (about 20 px).

**Layout.** One column at every width, max 36 rem (792 px at this size), centred at 1366; 16 px gutters at 390. Tables are `table.stack` below 600 px (one row becomes a small block, each value with its label), which the 22 px base needs. Buttons and the town select at least 48 px tall, 3 px focus ring offset 3 px. No hover-only states, no sticky elements, no motion. Line height 1.6, paragraphs max 60 characters.

**Base size.** `<html lang="en-GB" class="lp">` in this page only, and `html.lp{font-size:137.5%}` plus `body.d-large-print{font-size:22px;line-height:1.6}` (site.css sets the body in px, so both are needed). The header, navigation, designs control and disclaimer scale with it.

**Reads:** the six (`loadSix`). **Reuses:** `liveSpells`, `warningClause`, `renderBlock` (state, clause, failure body), `summaryText`, `readingList`, `rcmTile`, `stormLine`, `levelsFor`, `warningWindows`, `swatch`, `levelWord`, `findForecast`, `findSea`, `findUV`, `uvBand`, `statusBand`, `termsBlock`, `provLine`, `townSelect`, `setTown`. **New code:** about 170 lines of JS (two tables and the sentences), 70 of CSS.

**Type:** `Verdana, "DejaVu Sans", system-ui, sans-serif` for everything (wide, open letters; system fonts only), headings bold, figures tabular.

## 8. Palettes, contrast and the colour-blind check

Tokens per design, light then dark: **bg, panel (surface), ink, muted, accent**, plus line, accent-ink and the status words. The design's CSS sets them on `body.d-<slug>` for light, and again under `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) body.d-<slug>{...}}` and `:root[data-theme="dark"] body.d-<slug>{...}`, the same pattern as `site.css`. Nothing else is overridden.

| Design | Light: bg, panel, ink, muted, accent; line; accent-ink | Dark: bg, panel, ink, muted, accent; line; accent-ink |
|---|---|---|
| Postcard | #f3ede2, #fffdf8, #2a2420, #6b5f55, **#2d4f86**; #ddd3c4; #ffffff | #1c1714, #26201b, #f1e9df, #b8aa9c, **#a9bff0**; #3a312a; #1c1714 |
| Timetable | #eef1f4, #ffffff, #14202b, #4f5d6a, #1f5fa8; #c4ccd4; #ffffff | #0f151b, #18212a, #e6edf3, #9fb0bf, #7cb1ec; #2a3642; #0f151b |
| Two towns | #fafafa, #ffffff, #1b1b1f, #5d5d66, #2b4c9b; #c8c8cf; #ffffff | #141418, #1e1e24, #ececf1, #a3a3ad, #93acf0; #33333c; #141418 |
| Workbench | #f4f6f4, #ffffff, #1a1f1c, #56615a, **#0b6375**; #c9d1cc; #ffffff | #101412, #181e1b, #e3ebe6, #9eaca4, **#5ec2d0**; #2a332e; #101412 |
| Large print | #ffffff, #f2f2f2, #000000, #3d3d3d, #0040a0; #595959; #ffffff | #000000, #141414, #ffffff, #d0d0d0, #8ab4ff; #a6a6a6; #000000 |

Bold accents changed from round 1's outline, because of the check below: Postcard's rust (#9b3d23 light, #f0936f dark) is too close to the red and orange warnings, and Workbench's light teal (#0f6b5c) too close to red under deuteranopia.

**Contrast** (WCAG 2; ink, muted and accent on bg and on panel, the lowest of the six pairs; and accent-ink on accent, for buttons):

| Design | Light lowest | Light button | Dark lowest | Dark button |
|---|---|---|---|---|
| Postcard | muted on bg 5.31 | 8.16 | muted on panel 7.10 | 9.64 |
| Timetable | accent on bg 5.68 | 6.44 | accent on panel 7.25 | 8.18 |
| Two towns | muted on bg 6.24 | 8.05 | muted on panel 6.63 | 8.22 |
| Workbench | muted on bg 5.94 | 6.87 | muted on panel 7.17 | 8.93 |
| Large print | accent on panel 8.37 | 9.37 | accent on panel 8.82 | 10.05 |

All pass AA (4.5:1); Large print passes AAA (7:1). Line tokens are borders only; Large print's #595959 and #a6a6a6 give at least 3:1 against both its surfaces, for control edges.

**Status words.** The site's light `--fresh #2e7d4f` and `--stale #a35d00` fall below 4.5:1 on the tinted light grounds of Postcard (4.33, 4.37 on #f3ede2) and Timetable (4.45, 4.49 on #eef1f4). So in light, the four light designs set `--fresh:#24663f; --stale:#8a4f00; --old:#a3221b` (the IPMA-Data review's values; lowest 5.63:1, Postcard stale on bg), and Large print sets `--fresh:#1b4d30; --stale:#6a3c00; --old:#86160f` (lowest 8.30:1, stale on its #f2f2f2 panel; AAA). In dark, every design keeps the site's dark values (`#6cc48f`, `#e0a24a`, `#ff8a80`): lowest 7.05:1 (old on Postcard's dark panel). The disclaimer band keeps its own colours everywhere (12.0:1 light, 10.4:1 dark).

**Colour-blind check of each accent against the warning level colours.** Method: each colour simulated for protanopia and deuteranopia at full severity with the Machado, Oliveira and Fernandes (2009) matrices, applied in linear sRGB; distance in OKLab, ×100 (the same unit as the IPMA-Data cell's data-colour checks). Level colours from `site.css` for the same theme: light green #a8d5b5, yellow #f5c518, orange #d9621a, red #a51f2a; dark #22382f, #f4cc1c, #ec8030, #de3c5c. Target: at least 12 for every level under every simulation (half again the site's target of 8 between neighbouring data classes; the accent sits beside swatches on buttons, links and the "now" line, and must never pass for a level).

| Design, theme, accent | Normal: green, yellow, orange, red | Protan | Deutan | Lowest |
|---|---|---|---|---|
| Postcard light #2d4f86 | 42, 49, 33, 24 | 42, 45, 23, 15 | 43, 51, 32, 19 | 15 |
| Postcard dark #a9bff0 | 49, 25, 25, 31 | 49, 24, 26, 32 | 49, 25, 22, 23 | 22 |
| Timetable light #1f5fa8 | 38, 47, 33, 27 | 37, 42, 24, 21 | 40, 49, 32, 21 | 21 |
| Timetable dark #7cb1ec | 44, 29, 26, 30 | 45, 27, 25, 28 | 43, 30, 24, 20 | 20 |
| Two towns light #2b4c9b | 43, 51, 35, 26 | 43, 46, 26, 19 | 44, 53, 35, 23 | 19 |
| Two towns dark #93acf0 | 45, 29, 25, 29 | 45, 28, 25, 28 | 44, 30, 24, 21 | 21 |
| Workbench light #0b6375 | 38, 44, 30, 25 | 37, 38, 17, 13 | 38, 45, 26, 13 | 13 |
| Workbench dark #5ec2d0 | 45, 25, 25, 33 | 47, 21, 22, 29 | 44, 25, 19, 18 | 18 |
| Large print light #0040a0 | 47, 55, 39, 30 | 45, 49, 29, 20 | 47, 56, 38, 25 | 20 |
| Large print dark #8ab4ff | 47, 30, 28, 31 | 47, 28, 27, 31 | 46, 31, 26, 23 | 23 |
| *Rejected:* Postcard light #9b3d23 | 39, 38, 16, 5 | 43, 41, 14, 5 | 34, 37, 16, **1** | 1 |
| *Rejected:* Postcard dark #f0936f | 46, 17, 6, 18 | 38, 17, 8, 20 | 45, 13, **6**, 14 | 6 |
| *Rejected:* Workbench light #0f6b5c | 36, 41, 28, 25 | 35, 35, 12, 12 | 36, 42, 22, **8** | 8 |
| *Round 1 value, replaced:* Workbench dark #5cc7b0 | 45, 21, 24, 34 | 47, 16, 18, 29 | 44, 20, 14, 15 | 14 (replaced by #5ec2d0 for margin) |

Workbench light is the tightest (13, against red under both simulations): a teal dark enough for 4.5:1 on a light ground cannot get further from that red without turning blue. It passes the target; if the reviewer wants 15, the fallback is #0a5f73 (contrast 6.67 on bg, lowest 12 under protan against red), which does not help, so I would keep #0b6375 and rely on the rule that levels always carry their word.

Two notes, not failures. The light blue accents sit 10 to 13 (normal vision) from UV "extreme" #6a3d9a, and nearer under deuteranopia, since that purple simulates as a blue; UV tiles always carry their number and, in every design, the band word, and no accent ever fills a tile. No accent equals or imitates a data colour, and none uses IPMA's or Meteoalarm's colours or marks.

## 9. The chooser at `/d/` and `designs.json`

**Generated, not hand-written.** `scripts/build.mjs` already imports `./designs.mjs` when it exists (and `scripts/designs.mjs` is in the developer's scope). Instance D writes it: it reads `src/designs.json` and `SCHEMATIC` from `scripts/cards.mjs` and writes `_site/d/index.html` with `<!--HEAD-->`, `<!--HEADER-->` and `<!--FOOTER-->`, before `layout.mjs` runs, so the chooser, the designs control and the share cards cannot disagree. (If the conductor prefers a static `src/d/index.html`, as the IPMA-Data cell did, the content is the same; decision D1.)

**Page.** Title "Designs | Weather, from our data", description "Six designs of the same live weather data: the main design and Postcard, Timetable, Two towns, Workbench and Large print. Not a warning service.", share image `/assets/share/d.png`. h1 "Designs". Lede: "Six designs of the same data: the main design, which is the whole site, and five others, each showing one town in its own way. Every design reads the same live files from data.promptugal.news with the same rules." Then a `<ul>` of six cards, main first, in `designs.json` order. Each card is one link to the design's path (with `?id=1110600`, so all open on the same town) holding: the schematic as an `aria-hidden` SVG, `viewBox="0 0 160 100"`, aspect 16:10; the name; the line; five swatches (the light palette, bg, panel, ink, muted, accent) with a visually hidden "Palette: ..." text; a type sample "Lisboa · 0123456789 °C" set in the design's `fonts` with the figures in its `figures` stack (no reading-like numbers such as "13 to 19°", which could pass for a forecast). Under the list: "The drawings are layouts, not data. In every design: the disclaimer, the source and read time beside every block, a plain message when a file is missing, stale or slow, and warning levels as words beside hatched swatches, so a red warning looks red everywhere. The list is also at <a href="/designs.json">designs.json</a>."

**Layout.** Two columns of cards at 390 px (as IPMA-Data's chooser, `repeat(2,minmax(0,1fr))`, line 0.8 rem), three at 820 px and wider. The chooser's CSS is IPMA-Data's chooser style block (`src/d/index.html` there, Apache-2.0, same organisation), copied with its header line naming the source.

**The six `designs.json` entries** (`palette` is light; `palette_dark` is added for the record and for a later chooser in dark; `fonts` is the text stack, `figures` the stack for numbers):

```json
[
  { "slug": "main", "name": "The main design", "line": "The whole site on a calm page, in light or dark.", "path": "/",
    "palette": ["#f7f5f0", "#ffffff", "#1d2329", "#5b6670", "#0b5c7a"], "palette_dark": ["#12161a", "#1a2026", "#e8ecef", "#9aa6b0", "#5fb3d3"],
    "fonts": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif", "figures": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif" },
  { "slug": "postcard", "name": "Postcard", "line": "One town as a postcard: the day's message on the front, the sources on the back.", "path": "/d/postcard/",
    "palette": ["#f3ede2", "#fffdf8", "#2a2420", "#6b5f55", "#2d4f86"], "palette_dark": ["#1c1714", "#26201b", "#f1e9df", "#b8aa9c", "#a9bff0"],
    "fonts": "Charter, \"Iowan Old Style\", Georgia, serif", "figures": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif" },
  { "slug": "timetable", "name": "Timetable", "line": "Time first: every source for one town on one five-day axis, with each file's read time.", "path": "/d/timetable/",
    "palette": ["#eef1f4", "#ffffff", "#14202b", "#4f5d6a", "#1f5fa8"], "palette_dark": ["#0f151b", "#18212a", "#e6edf3", "#9fb0bf", "#7cb1ec"],
    "fonts": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif", "figures": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif" },
  { "slug": "two-towns", "name": "Two towns", "line": "Two to four towns side by side, block by block, on the same scales.", "path": "/d/two-towns/",
    "palette": ["#fafafa", "#ffffff", "#1b1b1f", "#5d5d66", "#2b4c9b"], "palette_dark": ["#141418", "#1e1e24", "#ececf1", "#a3a3ad", "#93acf0"],
    "fonts": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif", "figures": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif" },
  { "slug": "workbench", "name": "Workbench", "line": "The data first: each figure with its file, its JSON path and a fetch to copy.", "path": "/d/workbench/",
    "palette": ["#f4f6f4", "#ffffff", "#1a1f1c", "#56615a", "#0b6375"], "palette_dark": ["#101412", "#181e1b", "#e3ebe6", "#9eaca4", "#5ec2d0"],
    "fonts": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif", "figures": "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { "slug": "large-print", "name": "Large print", "line": "Large type, one column, sentences and tables instead of charts.", "path": "/d/large-print/",
    "palette": ["#ffffff", "#f2f2f2", "#000000", "#3d3d3d", "#0040a0"], "palette_dark": ["#000000", "#141414", "#ffffff", "#d0d0d0", "#8ab4ff"],
    "fonts": "Verdana, \"DejaVu Sans\", system-ui, sans-serif", "figures": "Verdana, \"DejaVu Sans\", system-ui, sans-serif" }
]
```

The `about` line of `designs.json` changes to: "The six designs of this site: the main design and five others from round 2 (team/rounds/2/design/PROPOSAL.md). Every design reads the same live files from data.promptugal.news. Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC."

**The designs control** (`scripts/lib.mjs`, `designsControl`) switches itself on once `designs.json` has more than one entry; nothing else is needed. Two small changes for D, from the IPMA-Data review: the summary reads "Designs: The main design" (not "main") on the main pages; and the control's links to the five designs carry no `?id=`, but the script of each design keeps the town when moving between designs: on load, each design rewrites the other designs' links in the control to add the current `?id=` (one shared function, `keepTown()`, in `place-blocks.js`, called by every design: C writes it).

## 10. Chooser schematics and share cards (`scripts/cards.mjs`)

Replace the five IPMA-Data entries of `SCHEMATIC` (broadsheet, chart-room, night-desk, almanac, glance) with these five (`main` stays). Boxes and lines only, no data, no level colours, each in its design's light palette; rendered in `schematics.png` here.

```js
  postcard: `<rect width="160" height="100" fill="#f3ede2"/><rect x="12" y="10" width="136" height="82" rx="3" fill="#fffdf8" stroke="#6b5f55" stroke-width=".6"/><rect x="20" y="18" width="58" height="8" rx="1" fill="#2a2420"/>${R(3, i => `<rect x="20" y="${32 + i * 5}" width="${70 - i * 12}" height="2.4" rx="1.2" fill="#6b5f55"/>`)}<rect x="110" y="16" width="30" height="24" fill="none" stroke="#2d4f86" stroke-width="1" stroke-dasharray="2 1.4"/><circle cx="118" cy="28" r="7" fill="none" stroke="#2d4f86" stroke-width=".8"/><rect x="86" y="50" width=".6" height="36" fill="#6b5f55"/>${R(5, i => `<rect x="20" y="${52 + i * 7}" width="58" height="2" rx="1" fill="#6b5f55" opacity=".35"/><rect x="${28 + (i * 9) % 20}" y="${51.5 + i * 7}" width="${20 + (i * 7) % 14}" height="3" rx="1.5" fill="#2d4f86"/>`)}${R(3, i => `<rect x="94" y="${60 + i * 9}" width="46" height=".7" fill="#6b5f55"/>`)}`,
  timetable: `<rect width="160" height="100" fill="#eef1f4"/><rect x="6" y="6" width="54" height="4" rx="1" fill="#14202b"/><rect x="6" y="15" width="148" height="80" rx="3" fill="#ffffff" stroke="#c4ccd4" stroke-width=".6"/>${R(6, i => `<rect x="${34 + i * 24}" y="18" width=".5" height="74" fill="#4f5d6a" opacity=".35"/>`)}${R(5, i => `<rect x="${38 + i * 24}" y="20" width="14" height="2.4" rx="1" fill="#4f5d6a"/>`)}${R(6, r => `<rect x="10" y="${31 + r * 10}" width="18" height="2.6" rx="1" fill="#14202b"/>`)}<rect x="40" y="30" width="52" height="5" rx="1" fill="none" stroke="#14202b" stroke-width=".7"/><rect x="92" y="30" width="20" height="5" rx="1" fill="#14202b" opacity=".75"/>${R(5, i => `<rect x="${37 + i * 24}" y="41" width="${10 + (i * 5) % 9}" height="4" rx="2" fill="#1f5fa8"/>`)}${R(3, i => `<rect x="${37 + i * 24}" y="51" width="${8 + (i * 7) % 10}" height="4" rx="2" fill="#1f5fa8" opacity=".7"/>`)}${R(5, i => `<rect x="${38 + i * 24}" y="60" width="8" height="6" rx="1" fill="none" stroke="#14202b" stroke-width=".6"/>`)}${R(3, i => `<rect x="${38 + i * 24}" y="70" width="8" height="6" rx="1" fill="none" stroke="#14202b" stroke-width=".6"/>`)}${R(6, i => `<circle cx="${36 + (i * 3)}" cy="83" r="1.3" fill="#4f5d6a"/>`)}<rect x="46" y="17" width="1.2" height="76" fill="#1f5fa8"/>`,
  'two-towns': `<rect width="160" height="100" fill="#fafafa"/><rect x="6" y="6" width="56" height="4" rx="1" fill="#1b1b1f"/>${R(2, c => `<rect x="${30 + c * 64}" y="15" width="60" height="80" rx="3" fill="#ffffff" stroke="#c8c8cf" stroke-width=".6"/><rect x="${36 + c * 64}" y="20" width="30" height="5" rx="1" fill="#1b1b1f"/>`)}${R(5, r => `<rect x="6" y="${33 + r * 12}" width="20" height="2.4" rx="1" fill="#5d5d66"/><rect x="6" y="${41 + r * 12}" width="148" height=".5" fill="#5d5d66" opacity=".4"/>${R(2, c => `<rect x="${36 + c * 64}" y="${33 + r * 12}" width="44" height="2" rx="1" fill="#5d5d66" opacity=".35"/><rect x="${40 + c * 64 + ((r + c) * 7) % 16}" y="${32.5 + r * 12}" width="${14 + ((r * 3 + c * 5) % 12)}" height="3" rx="1.5" fill="#2b4c9b"/>`)}`)}`,
  workbench: `<rect width="160" height="100" fill="#f4f6f4"/><rect x="6" y="6" width="52" height="4" rx="1" fill="#1a1f1c"/>${R(3, r => `<rect x="6" y="${15 + r * 27}" width="148" height="24" rx="3" fill="#ffffff" stroke="#c9d1cc" stroke-width=".6"/><rect x="11" y="${19 + r * 27}" width="26" height="3" rx="1" fill="#1a1f1c"/>${R(3, i => `<rect x="11" y="${26 + r * 27 + i * 4}" width="${40 + (i * 13) % 22}" height="1.8" fill="#0b6375"/><rect x="${70 + (i * 5) % 8}" y="${26 + r * 27 + i * 4}" width="16" height="1.8" fill="#1a1f1c"/>`)}<rect x="118" y="${19 + r * 27}" width="30" height="6" rx="1.5" fill="none" stroke="#0b6375" stroke-width=".7"/><rect x="122" y="${21.2 + r * 27}" width="22" height="1.6" fill="#0b6375"/>`)}`,
  'large-print': `<rect width="160" height="100" fill="#ffffff"/><rect x="34" y="8" width="70" height="10" rx="1" fill="#000000"/>${R(3, i => `<rect x="34" y="${24 + i * 7}" width="${92 - i * 18}" height="4" rx="1" fill="#3d3d3d"/>`)}<rect x="34" y="47" width="92" height="25" fill="#f2f2f2" stroke="#000000" stroke-width=".7"/>${R(4, i => `${i ? `<rect x="34" y="${47.5 + i * 6}" width="92" height=".6" fill="#000000"/>` : ''}<rect x="38" y="${50 + i * 6}" width="22" height="2.6" fill="#000000"/><rect x="70" y="${50 + i * 6}" width="14" height="2.6" fill="#000000"/><rect x="96" y="${50 + i * 6}" width="18" height="2.6" fill="#000000"/>`)}<rect x="34" y="79" width="40" height="9" rx="2" fill="#0040a0"/><rect x="40" y="82.5" width="28" height="2" fill="#ffffff"/>`,
```

What each drawing says: Postcard, a card with a name, a three-line message, a dashed stamp with a postmark, five day bars on the left and address lines on the right. Timetable, a grid of five day columns, six source rows, a spell bar, range bars, tiles, read-time dots and the "now" line. Two towns, two columns of aligned rows with a row label column. Workbench, three blocks of path lines (accent) beside values, each with a copy button. Large print, a heading, three lines of text, a ruled table and one large button.

`STYLE` in `cards.mjs` (the share card's colours and type), replacing the five old entries:

```js
  postcard: { bg: '#f3ede2', ink: '#2a2420', muted: '#6b5f55', accent: '#2d4f86', band: '#2a2420', bandInk: '#f3ede2', font: 'Charter,Iowan Old Style,Georgia,serif' },
  timetable: { bg: '#eef1f4', ink: '#14202b', muted: '#4f5d6a', accent: '#1f5fa8', band: '#14202b', bandInk: '#eef1f4', font: SANS },
  'two-towns': { bg: '#fafafa', ink: '#1b1b1f', muted: '#5d5d66', accent: '#2b4c9b', band: '#fff4d6', bandInk: '#3b2f00', font: SANS },
  workbench: { bg: '#f4f6f4', ink: '#1a1f1c', muted: '#56615a', accent: '#0b6375', band: '#1a1f1c', bandInk: '#e3ebe6', font: 'ui-monospace,SFMono-Regular,Menlo,monospace' },
  'large-print': { bg: '#ffffff', ink: '#000000', muted: '#3d3d3d', accent: '#0040a0', band: '#000000', bandInk: '#ffffff', font: 'Verdana,DejaVu Sans,system-ui,sans-serif' },
```

And a card for the chooser: `PAGES` gains `['d', 'Designs', 'Six designs of the same live data: the main design and five others, each showing one town its own way.']`, `exists()` admits `'d'`, and `DRAW.d` is six small rounded boxes in a 3 by 2 grid (`ACC` outline on the first, `EDGE` on the rest), no data. Six new PNGs: `d.png`, `d-postcard.png`, `d-timetable.png`, `d-two-towns.png`, `d-workbench.png`, `d-large-print.png`, each under 300 KB (the script checks).

## 11. Folding the long phone pages (review S8)

Measured by the reviewer at 390 px: `/observations/` about 15,300 px, `/forecasts/` about 12,600 px. Target for both: under 5,000 px at 390 px with the live files, measured with `scripts/shots.mjs` and recorded in NOTES-D. Nothing changes at 600 px and wider except where said.

### 11.1 `/observations/`, the station table (`pages/observations.js`, `sortableTable`)

The length is 227 rows (168 with a reading for 15:00 UTC at the 16:32 UTC read), each two to four lines tall at 390 px because nine columns wrap. Three changes:

1. **Stations that sent nothing leave the table, at every width.** Every value in their row is "none"; they move to a `<details class="fold">` under the table: summary "<n> stations sent nothing for <HH:MM> UTC", body one paragraph of names, comma-separated, each followed by its "nearest to" towns as links where it has any. The caption counts both: "<r> of <n> stations reported for <hour>; the <n−r> that did not are listed below the table."
2. **Fewer columns below 600 px.** The table shows Station, Temperature, Wind (km/h) and Rain; Humidity, Wind from, Pressure, Radiation and Nearest to get `class="c-opt"` and are hidden below 600 px. A button above the table, "Show all 9 columns" / "Show 4 columns" (`aria-pressed`), toggles `.all-cols` on the table's wrapper; with all columns the table scrolls sideways inside `.table-wrap` as now. The choice is not stored.
3. **The first 20 rows below 600 px.** After every sort, rows 21 onwards get `hidden`; under the table, a button "Show the other <n> stations" reveals them and moves focus to row 21's header cell; after that, sorting keeps them shown. At 600 px and wider all rows show, as now.

Estimate at 390 px: header and map about 1,500 px, table 20 rows of one line (about 40 px) plus caption and buttons about 1,050 px, the silent stations folded 60 px, collector strip and provenance about 700 px: about 3,300 px. Sorting, `aria-sort` and the "none sorts last" rule are unchanged. The page's note gains one sentence: "On a phone the table starts with four columns and the first 20 stations; buttons above and below it show the rest."

### 11.2 `/forecasts/`, the 35 small multiples (`pages/forecasts.js`, `card()`)

The length is 35 cards of five day rows plus a weather line each. Below 600 px each card folds:

1. Each card is built as `<details class="fc-fold" open>`; on load and on `matchMedia('(max-width: 599px)')` change, cards are closed below 600 px and opened at 600 px and wider (as `place.js` does with its picker). At 600 px and wider the `<summary>` is styled as the card's current header and its marker hidden, so the desktop page looks as now.
2. The `<summary>` holds no link (a link inside a summary is a poor target and is read badly): "<Place> · today <min> to <max>° · rain <n>%", with today's range bar on the shared scale beside it (`aria-hidden`; the text says it). A place with no forecast for today: "<Place> · no forecast for today".
3. Inside the opened card, first line: the place link "Everything for <place> in Your town" (moved out of the `h4`), then the five rows as now.
4. Each region heading gains two small buttons, "Open all" and "Close all", for its cards.

Estimate at 390 px: 35 summaries at about 52 px (1,820 px) plus three region headings, the intro, notes, provenance and the closed table: about 3,800 px. The full table (`cb-more`) stays closed, as now.

**CSS** for both goes in `src/assets/charts.css` (both pages already load it): `.c-opt`, `.all-cols`, `.fc-fold`, each scoped to `max-width:599px` where it hides anything. `forced-colors` keeps the range bar's `CanvasText` fill.

## 12. Split of work between two developer instances

Two instances, **C** and **D**, with disjoint files. C's first commit is `place-blocks.js` with `place.js` using it and `/place/` unchanged; D writes against the export list of section 1 from the start and pulls C's commit before testing. `designs.json` lists all five, so the site builds only when both are in: the conductor merges C and D before the build and the review.

| Instance C | Instance D |
|---|---|
| `src/assets/js/place-blocks.js` (new, section 1, including `keepTown()`) | `src/designs.json` (section 9) |
| `src/assets/js/pages/place.js` (imports from place-blocks; no visible change) | `scripts/designs.mjs` (new: the chooser) |
| `src/d/postcard/index.html`, `postcard.css`, `postcard.js` | `scripts/cards.mjs` (`SCHEMATIC`, `STYLE`, `PAGES`, `DRAW.d`) and the six PNGs in `src/assets/share/` |
| `src/d/two-towns/index.html`, `two-towns.css`, `two-towns.js` | `scripts/lib.mjs` (the control's "The main design" wording only) |
| `src/d/large-print/index.html`, `large-print.css`, `large-print.js` | `src/d/timetable/index.html`, `timetable.css`, `timetable.js` |
| `tests/place-blocks.test.mjs` (new: `placesFromURL`, `liveSpells`, `warningClause` and `forecastScale` on the fixtures in `tests/fixtures/`) | `src/d/workbench/index.html`, `workbench.css`, `workbench.js` |
| `team/rounds/2/build/NOTES-C.md` | `src/assets/js/headlines.js` (new) and `src/assets/js/pages/home.js` (imports from it; no visible change) |
| | `src/assets/js/pages/observations.js`, `src/assets/js/pages/forecasts.js`, `src/assets/charts.css`, the one-sentence note in `src/observations/index.html` (section 11) |
| | `team/rounds/2/build/NOTES-D.md` |

Load: C has the refactor and the three designs that reuse the renderers most (about 330 lines moved, then about 490 lines of JS and 250 of CSS new). D has the two designs with the most new drawing code, the chooser, the cards and the folding (about 490 lines of JS, 190 of CSS, 90 for the chooser, 80 for folding). Neither touches `site.css`, `data.js`, `map.js`, `places.js` or `codes.js`. The /uv/ introduction's band wording (in the aim) is the writer's, in `src/uv/index.html`, and is in neither list.

Both instances check their pages at 390 and 1366 px, light and dark, with a fresh read and with one file blocked (for example by pointing a copy of the page at a wrong source id in the console), record page heights and any horizontal scroll from `scripts/shots.mjs`, and run the validator, the leak scan and the wording check before handing over.

## 13. Decisions for the conductor

- **D1.** The chooser generated by `scripts/designs.mjs` (proposed) or written by hand in `src/d/index.html`.
- **D2.** Designs follow the reader's light or dark setting (proposed, section 0), not one fixed theme each as in the IPMA-Data cell.
- **D3.** Timetable at 390 px groups by day, so its provenance lines sit in a list straight after the day sections, linked from each item, rather than under each block. Accept, or ask for a source-by-source phone layout (longer, and no longer time first).
- **D4.** Workbench's light accent passes the colour-blind target at 13, the lowest of the ten; accept, or ask for a blue (which would make four of the five accents blue).
- **D5.** Two towns allows up to four towns; at 1366 px four columns are about 18 rem each, enough for the row-form forecast. Keep four, or cap at three.
- **D6.** The station table's silent stations leave the table at every width (proposed), or only on phones.
