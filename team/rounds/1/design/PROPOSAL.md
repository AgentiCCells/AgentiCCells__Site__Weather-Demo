# Round 1 design proposal: weather by place

By designer.weather-demo@AgentiCCells.dinis, 2026-11-18, round 1. Text CC BY 4.0. This is a proposal: the developer builds what passes review.

Built on the analyst's notes (`team/rounds/1/data/NOTES.md`, files read 16:21 UTC) and `src/assets/js/places.js`. Counts quoted here come from those reads (anything in angle brackets, such as `<station>` or `<value>`, is a placeholder, not a reading; stale and failure lines are examples of states, not events), or from my own read of `storm-charles-archive/latest.json` and the storm site's `weather/warnings.json` at about 17:30 UTC on 18 November; they will change and are examples, not values to copy into pages. No mock-up files: each drawing below either reuses a working page of the IPMA-Data cell or is specified closely enough to build.

**Reference.** The IPMA-Data cell's round 1 proposal and site (AgentiCCells/AgentiCCells__Site__IPMA-Data, `team/rounds/1/design/PROPOSAL.md`, `src/`, Apache-2.0 for code, CC BY 4.0 for text, same organisation). Its colour tokens, hatches, hex map, failure-state table and chart rules are already in this repository (`site.css`, `charts.css`, `map.js`, `data.js`, copied at 1ab888d) and **stay as they are**: section 2 of that proposal is this site's visual system too. This proposal adds what that site lacks: the place view, a home page that leads with every source's age, a compact provenance line, the Storm Charles archive drawn live, and links from every source page back to towns.

## 0. Reuse map (for the developer)

Every reused file keeps a header line naming where it came from (repository, path, commit, licence), as `map.js` already does.

| IPMA-Data drawing | File there | Here | Verdict |
|---|---|---|---|
| Warnings hex map, insets, time control, detail panel, table, tile fallback | `assets/js/map.js` (`warningsBlock`, `warningsMap`, `areaMap`, `warningTable`, `warningWindows`, `levelsFor`) | `/`, `/warnings/` | **Reuse as is.** One change: the detail panel adds "Towns in this area" (change 3.1). |
| Warnings timeline | `pages/warnings.js` `timeline()` | `/warnings/` | **Reuse as is.** |
| MeteoAlarm context panel | `pages/warnings.js` `meteoalarm()` | `/warnings/`, place card (collapsed) | **Reuse as is**; on the place card filtered by area name (change 1.9). |
| Forecast small multiples on one shared scale | `pages/forecasts.js` | `/forecasts/`, place card | **Change**: the picker and focus card move to the place view; each small multiple's name links to `/place/?id=`. The range bar and rain row are reused in the place card. |
| Stations point map, one measure at a time, sortable table | `pages/observations.js` | `/observations/` | **Reuse**, plus a "nearest to" column (change 3.3). |
| Fire-risk class map, day switcher, counts | `pages/fire-risk.js` | `/fire-risk/` | **Reuse**, plus town names for 24 DICO codes (change 3.4). |
| Sea range bars, sea temperature as numbers | `pages/sea.js` | `/sea/`, place card | **Reuse**, plus towns within 25 km per coast (change 3.5). |
| UV grid with split tiles | `pages/uv.js` | `/uv/`, place card | **Reuse**, plus row links to towns (change 3.6). |
| Home five-place strip | `pages/home.js` `forecast()` | none | **Drop**: the place view replaces it. |
| Home status list | `pages/home.js` `status()` | `/` | **Change** into the headline list with a status band (change 2.2, 2.4). |
| Provenance box, age banner, failure, loading, run strip | `data.js` | every source page | **Reuse as is** (already copied). The place card uses the new compact line (section 4). |
| Storm Charles page | `storm-charles/index.html` (static text) | `/storm-charles/` | **New** drawing in `#storm-live` (change 3.7); the words are the writer's. |
| The five designs | `d/*` | round 2 | **Not reused**: five new ones (section 6). |

## 1. The place view, `/place/` (new; the centre of the site)

**Files read:** the six latest.json files (ipma-warnings, ipma-city-forecasts, ipma-observations, ipma-fire-risk, ipma-sea, ipma-uv), fetched once in parallel with `getJSON()`; their six card.json files after the values (they only feed the terms); meteoalarm-pt latest.json only when its panel is opened. About 24 KB with gzip (analyst, 16:25). Switching towns needs no new fetch. Joins: `joinPlace()`, `findStation()`, `findSea()`, `findUV()`, `findFireRisk()` from `places.js`. **Cost:** the largest item of the round, about half the developer's pass (one page, one module `pages/place.js`, about 400 lines, mostly reusing range bars, swatches and tiles).

### 1.1 The URL

`/place/?id=<globalIdLocal>`, for example `/place/?id=1080500` (Faro). The id is IPMA's, from `PLACES`; an unknown or missing id shows the picker and the line "Choose a town: no town has the id 123." (or nothing when `id` is absent). On a choice the page uses `history.pushState` to set `?id=`, updates `document.title` to "Faro: weather from our data" and moves focus to the card's heading. Back and forward work (`popstate`). A "Copy link to this town" button copies the full URL (Clipboard API; if refused, it selects the URL in a read-only field). The last town chosen is kept in `localStorage` (try/catch, a convenience only) and offered on the home page as "Your last town: Faro".

### 1.2 The town picker

- **Without JavaScript:** the page HTML (written at build time from `PLACES`, which holds IPMA's identifiers, not weather values) has an `<nav aria-label="Towns">` with three groups, each an `<h2>` and a `<ul>` of 35 plain links `<a href="/place/?id=1080500">Faro</a>`: **Mainland** (north to south, in `map.js` `ORDER` of the warning areas, then by name), **Madeira** (2), **Azores** (9). A `<noscript>` line says: "The figures for a town are read live in your browser from data.promptugal.news and need JavaScript. The files: ..." with links to the six latest.json files and to IPMA's place forecast page.
- **With JavaScript:** a filter field above the list ("Find a town", `type="search"`, matches without accents through `slug()`, so "loule" finds Loulé), and a live count ("4 of 35 towns", `aria-live="polite"`). Down arrow in the field moves to the first visible link; the links are ordinary tab stops; Enter follows. Links are intercepted for `pushState`, so a town opens without a reload, but a middle click or "open in new tab" still works because they are real links. The chosen town has `aria-current="page"`.
- **Each link carries its area's level** once the warnings file is read: a 12 px swatch (fill and hatch from `map.js` `swatch()`) and, for screen readers, "Faro, yellow warning now". So the picker is also a list of where the warnings are. Green areas get no swatch, only the word in the accessible name.
- **Layout:** at 900 px and wider, a left column 17 rem wide, sticky, scrolling on its own, with the card to its right (max 52 rem). Below 900 px, the picker sits in a `<details>`, open when no town is chosen, closed (summary "Choose another town (35)") once one is.
- **Optional, only if time allows:** a "Use my location" button that calls `navigator.geolocation` once on press and picks the nearest town with `nearest()`. The position never leaves the browser and is not stored; the line under the button says so. The conductor decides (decision D3).

### 1.3 The card, top to bottom

The order at both widths. Each block is a `<section>` with an `<h2>`, its body, and the provenance line (section 4) as its last line. Each block loads, fails and goes stale **on its own**: one missing file never blanks the card.

1. **Heading:** "Faro" (h1), then "Warning area Faro (FAR) · mainland · forecast place 1080500". A one-line status for the card: "6 of 6 files read, all fresh" or "5 of 6 files read: Stations could not be read" or "Sea read <n> h ago (stale)". Then the Copy link button.
2. **Summary sentence** (new, generated, only from values on the card): "Faro: <level> warning for <type> until <time> today. Today <min> to <max> °C, rain <n>%. <station> station: <value> °C at 15:00 UTC. UV 2.4 (low). Fire risk class 1 (low)." (a pattern; UV and fire values as read at 16:13 UTC) A clause is left out when its block has no value and replaced by a short reason ("Stations not read."). It is a paragraph with `aria-live="polite"` so a town change is announced once.
3. **Warnings, now and the next days.** A strip of four cells from `warningWindows()`: **Now**, **Today**, **Tomorrow**, **Day after** (Lisbon calendar days), each showing the highest level in that window for the town's area as swatch plus word ("Yellow"), never colour alone. Under it, every spell for the area in time order: swatch, level and type, "18 Nov 12:00 to 18 Nov 18:00 (Portugal time)", IPMA's Portuguese text in a `<details lang="pt">`. Green: "No yellow, orange or red warning for the Faro area in IPMA's file." (a result, drawn calmly, not an error). Spells whose `end` has passed are left out and counted ("1 spell already ended is not shown"). A link: "All warnings on the map" to `/warnings/`.
4. **MeteoAlarm, as context** (collapsed `<details>`: "The same warnings as relayed by MeteoAlarm, in English"). Opening it loads meteoalarm-pt, keeps messages not yet expired whose area name equals the town's warning area name (by name: no static table, so Azores names that do not match show "MeteoAlarm writes the Azores areas differently; see all messages on /warnings/"), and shows each: level swatch and word, hazard, onset to expiry in UTC, time of issue, English text, then MeteoAlarm's disclaimer and link to meteoalarm.org from `latest.attribution`. It is never counted as a second source that confirms IPMA.
5. **Forecast, five days.** At 520 px and wider, five columns: day ("Wed 18 Nov"; "Today" on the Lisbon date), weather in words from `codes.js` (no invented icons), the min to max range bar on **the scale shared by all 35 places in the file** (the same as `/forecasts/`, so two towns compare by eye; scale stated under the block), "<min> to <max>°" printed, rain chance as a 0 to 100 % bar on its own row with the number, wind as "W, moderate". Below 520 px, one row per day: "Wed 18 · <min> to <max>° · rain <n>% · <weather>". Under the block: "IPMA's forecast run: 18 Nov 15:31 (IPMA's time, as given; the 16:21 UTC read)". Days before today are dropped and counted.
6. **Nearest station.** "<station>, <km> km away, readings for 15:00 UTC." A definition list of temperature, humidity, wind (km/h, with direction in words only once `codes.js` confirms `wind_dir_id`), rain in the hour (mm), pressure (hPa). A null value shows "no value" (in `--muted`), never a zero and never another station's value. When the nearest is silent: "Praia da Rocha (3.8 km) sent nothing for 15:00 UTC. Nearest station that did: Portimão (Aeródromo), 5.4 km." and the reporting station's values. When none reports: "No station in IPMA's file sent a reading for 15:00 UTC."
7. **Sea.** When `near`: "<coast>, 20.7 km away" (Faro at the 16:13 UTC read), then three days, each with the wave range bar on the scale shared by all 12 coasts (from `sea.js`), period, direction, total sea, sea temperature as numbers. When not `near`: "No sea point within 25 km (25 km is this site's proposal, not IPMA's rule). The nearest is <coast>, 39.7 km away." (Coimbra at the 16:13 UTC read) and a link to `/sea/`; no values, because a coast 40 to 170 km away does not describe the town.
8. **UV.** Today's index large ("2.4"), the WHO band as swatch plus word ("Low"), then the next days as the small tiles from `uv.js`, split in two where IPMA gives two values. When not exact: "IPMA gives no UV for Loulé. Shown: Faro, 15.9 km away." The ids 0 and 1081525 are never used (places.js already refuses them).
9. **Fire risk.** Today's class: swatch, "Class 1, low", then the next two days, and "Municipality DICO 0805". When matched by nearest point, not by code: "Nearest municipality point, 7.8 km away." Islands: **"No fire-risk data for the islands: IPMA publishes no fire risk class for Madeira or the Azores."** (decision D5 on the wording). Every municipality in one class is a real state, not an error.
10. **Storm Charles link** (Lisboa and Funchal only): "A storm archive for this place: Storm Charles, 10 to 12 November 2026." to `/storm-charles/`. Outside the "now" blocks, with a rule above it, and no age.
11. **"How this card was put together"** (`<details>`, new; it serves "use the data"): one row per block with the file, the key and the join, filled with this town's numbers: "Warnings: `active[]` where `area` = FAR", "Station: nearest of 227 by haversine from 37.0146, −7.9331" (Faro's position in `PLACES`), "UV: id 1080500 not in the file; nearest UV place in the table". Then a copy-paste `fetch()` snippet with this town's id. Where `byPlaceFor()` finds a data.promptugal.news by-place file, a "See also" link to it, with the analyst's caution that it covers the Algarve only.
12. **Terms** (`id="terms"`): when the six IPMA cards' `terms.summary` are identical (compared at run time), one paragraph: "All six IPMA files carry the same terms: ..." with IPMA's page; otherwise one paragraph per source. Each block's line links here.

### 1.4 Layout

- **1366 px:** picker column 17 rem, card 52 rem. Heading, summary, warnings and forecast take the card's full width; station, sea, UV and fire risk sit in a grid `repeat(auto-fit, minmax(15rem, 1fr))`, which gives two by two. Then storm link, how it was made, terms.
- **390 px:** one column, 16 px gutters, no horizontal scroll; the picker `<details>` first, then the card in the order above. The four-cell warning strip stays four cells (each about 80 px: swatch above the word). The forecast switches to rows.

### 1.5 Failure and stale states, per block

| State | What the block shows |
|---|---|
| Loading | `loading()` in the block, at the block's usual height, so the page does not jump. |
| Slow (over 4 s) | "Still reading the stations file: data.promptugal.news is slow to answer." The other blocks draw as their files arrive. |
| Missing (error, timeout, bad JSON) | `failure()` in that block only, with the file link and IPMA's page. The summary sentence says "Stations not read." The card status counts it. |
| Stale (over 3 h) / old (over 24 h) | The block draws; its provenance line shows the state word in `--stale` or `--old` and a left rule in the same colour; old warnings add "These warnings may have ended or changed: see ipma.pt." |
| Content older than the read | Forecast `updated` over 14 h: "IPMA's run is 16 h old; a newer forecast may exist." Station `hour_utc` over 3 h before `read_at`: "These readings are for 11:00 UTC, 5 h before the read." |
| Read, no match | Warnings: green. Fire: islands sentence. UV: nearest place and distance. Sea: "no sea point within 25 km". Station: silent nearest named. |
| Shape change (a key places.js reads is absent) | "The file was read but its shape has changed, so this block cannot be matched to the town." Never a value. |
| Card not read | Values still show; the line reads "terms: card not read; see the card before reuse". |

## 2. Home, `/` (change)

**Files read:** the seven current latest.json files and storm-charles-archive latest.json; ipma-fire-risk also as the map's shape. **Cost:** small to medium; most parts are reused.

1. **Status band** (new), directly under the header's disclaimer, on the home page and the place view: one line, `role="status"`. All fresh: "All seven sources read within the last 3 hours (oldest 12 min ago)." in `--muted`, quiet. Any not fresh: the band takes the `--stale` or `--old` rule and lists only the problem sources: "Not current: Stations read <n> h ago (stale) · Sea could not be read." Each name links to its row below. While any file is still loading after 4 s: "Still reading 2 of 7 sources: data.promptugal.news is slow." The band is honest first and short; it never says "all fine" while a file is missing.
2. **Heading and entry:** h1 "What the data says now", one sentence on what the site is (the writer's), then **"Your town"**: a `<form action="/place/" method="get">` with a `<select name="id">` of the 35 towns in the three groups and a "Show" button. It works without JavaScript and produces `/place/?id=`. With `localStorage`, "Your last town: Faro" appears beside it as a link.
3. **The country's warnings:** `warningsBlock()` as on IPMA-Data (map, time control, detail panel, table behind a skip link), with "Towns in this area" in the panel.
4. **Every source, in one line each** (change of `home.js` `status()`): a list of eight rows. Each: state dot plus state word ("fresh", "stale", "old", "not read", "reading"), the source name linking to its page, **our own headline** computed from the file, and the read time with age. Headlines (do not reuse index.json's "in 25 areas" wording, per the analyst):
   - Warnings: "32 yellow or orange warnings in 13 of 25 areas; 13 areas with one in force now." (16:21 UTC read)
   - Forecasts: "35 places, five days; IPMA's run 18 Nov 15:31."
   - Stations: "168 of 227 stations sent a reading for 15:00 UTC; warmest <station> <value> °C, coolest <station> <value> °C."
   - Fire risk: "Today: all 278 mainland municipalities in class 1 (low)." or the counts by class.
   - Sea: "12 coasts; highest waves today up to <value> m (<coast>)."
   - UV: "Highest UV today: <value> (<band>), <place>." (ids 0 and 1081525 excluded)
   - MeteoAlarm (context): "32 of 58 messages not expired, as relayed from IPMA."
   - Storm Charles archive: "A fixed record of 10 to 12 November 2026: 142 files, 142 verified." with "archived 17 Nov 2026, 19:27 UTC" and **no staleness** (it is meant to be fixed).
   A headline is only written when its file was read; a failed read says "Could not read: <error>. Nothing is shown in its place." A file read but stale keeps its headline, with the state word before it.
5. **Links out:** three short cards: "How it was made", "Use the data" (JavaScript and curl), "Behind the scenes"; and one line for "Use with AI".

## 3. One page per source

Every source page keeps the IPMA-Data pattern: lede, `ageBanner()` above the chart, the chart, the table, the `provenance()` box and `runStrip()` under it. Each of 3.1 to 3.6 is a small change (under an hour each); 3.7 is medium.

### 3.1 `/warnings/` (reuse)

Map, timeline, table and MeteoAlarm panel exactly as IPMA-Data. **Add:** in the detail panel, "Towns in this area: Faro, Loulé, Portimão, Sagres" from `PLACES` filtered by `area`, each linking to `/place/?id=`. Islands areas without a forecast place (MCN, MRM) say "No forecast place in this area". MeteoAlarm stays titled as context with its disclaimer and link.

### 3.2 `/forecasts/` (change)

Small multiples of all 35 on one scale, as IPMA-Data. **Change:** remove the place picker and the focus card (the place view is that now); each place's name links to `/place/?id=`; a line at the top: "To see a town's forecast with its warnings, station, sea, UV and fire risk, open it in Your town."

### 3.3 `/observations/` (reuse)

Point map and sortable table as IPMA-Data. **Add:** a table column "Nearest to" naming the towns whose nearest station this is (from `PLACES` and `nearest()`), linking to them; and in the map caption the count of silent stations, which is already there.

### 3.4 `/fire-risk/` (reuse)

Class map with day switcher and counts as IPMA-Data. **Add:** the table names the 24 municipalities that hold a forecast place ("0805, municipality of Faro"), from `dicoOf()` over `PLACES`; the rest stay as DICO code and district, never a guessed name. Sagres and Penhas Douradas read "municipality containing Sagres", because they are villages, not seats.

### 3.5 `/sea/` (reuse)

Range bars and sea temperatures as IPMA-Data. **Add:** under each coast's name, "Nearest coast for: Faro, Loulé (within 25 km)" from `findSea()`; coasts that are nobody's within 25 km say nothing.

### 3.6 `/uv/` (reuse)

Grid with split tiles as IPMA-Data. **Add:** row names whose id is in `PLACES` link to the place view; a caption line lists the nine towns that borrow another place's value, computed with `findUV()` (at the 16:21 UTC read, for example: "Loulé, Portimão and Sagres use Faro's value in Your town; Vila do Porto uses Ponta Delgada's").

### 3.7 `/storm-charles/`, the `#storm-live` section (new)

The writer owns the page's words; this is the drawing inside `<section id="storm-live">`. **Files read:** `storm-charles-archive/latest.json` (the manifest: `counts`, `datasets[]`, `files[]` with `path`, `dataset`, `bytes`, `verified`, `about`, `url`; `catalogue.built_at`; `read_at`) and, from the storm site (CORS open, analyst 16:23), `https://storm-charles.promptugal.news/api/v1/2026-11-10-storm-charles/weather/warnings.json` (`history[]`: 31 entries at my read, each with `at_utc` or `read_utc`, `kind`, `event` or `added` and `removed`, `source`). **Cost:** medium (one module, about 200 lines).

1. **Badge, not an age:** "Archive · fixed on 17 Nov 2026, 19:27 UTC · catalogue built 13 Nov 2026, 15:44 UTC". `staleness()` is not run on this source (analyst's rule).
2. **The archive at a glance:** one horizontal bar per group (first part of `dataset`: flights 91 files, decisions 22, weather 12, transport 8, exposure 7, signals 1, watch 1 at my read), lengths by bytes on one scale, files and kB printed at the end of each bar, bars in `--muted` (not a data colour: groups are not levels). Caption: "142 files, 5.1 MB; 142 verified (sha256 of the bytes matches the catalogue)". Counts come from `counts`, never typed in.
3. **The timeline:** an SVG axis from 9 Nov 00:00 to 13 Nov 00:00 UTC, day lines labelled "Mon 9" to "Thu 12", the incident days 10 to 12 Nov shaded in `--line`. Marks: one dot per `history[]` entry at its time (`at_utc` when it starts with an ISO time, else `read_utc`; text like "between 08:22 and 08:43" is placed at its first time and quoted as written), a filled dot for an IPMA file change (has `added` or `removed`, with "+2 / −1" beside it), a ring for a fact or communiqué. A second row: one tick per hourly flight frame, from the date and hour in `flights/frames/<airport>/<date>/<hour>.json` paths, labelled by airport. After a break mark, two text markers: "catalogue built 13 Nov" and "archived 17 Nov". Under 560 px the SVG is replaced by the list in 4, which is the same information.
4. **The list behind the timeline:** a vertical list by day (h3 per day), each entry with time (UTC), kind, the event text (Portuguese text in `lang="pt"`), "+N / −N warnings" with level words for file changes, and the source link. This is the accessible form at every width; the SVG is `aria-hidden` with a link "Timeline as a list".
5. **The file list:** one `<details>` per group, **weather open**, others closed; each file: path, kB, "verified" or "not verified" as a word, a link to the file on the storm site, and `about` in a nested `<details>`.
6. **Failures:** manifest not read: `failure()` for 2 and 5, the timeline still tries. warnings.json not read: "Could not read the storm site's warnings history (storm-charles.promptugal.news). The file list below still links every archived file." A file with `verified: false` is listed first in its group with "not verified: its bytes did not match the catalogue". Provenance line: "Storm Charles archive (storm-charles.promptugal.news), via data.promptugal.news · archived 17 Nov 2026, 19:27 UTC · terms: the storm site's own data, Apache-2.0; quoted sources keep their own terms · card · latest.json". reads.json is 404, so no run strip; say "No collector history: this source was read once."

## 4. The provenance line, and staleness states

### 4.1 The line (new component, `data.js` `provLine(src, opts)`)

Used on the place card and the home rows; source pages keep the full `provenance()` box. One line in 0.85 rem `--muted`, wrapping naturally at 390 px. Exact pattern, the parts joined by " · ":

`<Publisher short> (<source id>), via data.promptugal.news` · `read <D Mon>, <HH:MM> UTC, <age>` · `<state word, only when not fresh>` · `terms: <link "as below" to #terms, or the card's summary when the page has no terms paragraph>` · `card` · `latest.json`

Examples:

- Fresh: "IPMA (ipma-observations), via data.promptugal.news · read 18 Nov, 16:13 UTC, 8 min ago · terms: as below · card · latest.json"
- Stale: "IPMA (ipma-sea), via data.promptugal.news · read 18 Nov, <HH:MM> UTC, <n> h ago · **stale: the collector may have missed runs** · terms: as below · card · latest.json"
- Missing: "IPMA (ipma-uv), via data.promptugal.news · **not read: timed out after 15 s** · card · latest.json" (the block above holds the `failure()` message)
- Context source: "MeteoAlarm (EUMETNET), from IPMA (meteoalarm-pt), via data.promptugal.news · read 18 Nov, 16:13 UTC, 8 min ago · issued <D Mon>, <HH:MM> UTC · MeteoAlarm's disclaimer · meteoalarm.org · card · latest.json"

Publisher short is the card's `publisher` up to its first comma (falling back to "IPMA" for the six IPMA sources if the card is not read, since `latest.provenance.source` names IPMA's file). Time and age come from `latest.read_at` via `fmtUTC()` and `staleness()`; the state word is `staleness()`'s own text after the colon.

### 4.2 States

| State | Rule | Word on the page | Colour (always with the word) |
|---|---|---|---|
| fresh | `read_at` up to 180 min old (`STALE_MIN`) | "8 min ago" | none; dot `--fresh` on home rows |
| stale | over 180 min | "stale: the collector may have missed runs" | `--stale` word and left rule |
| old | over 24 h (`OLD_MIN`) | "old: these figures may no longer hold" | `--old` word and left rule |
| missing | error, HTTP status, timeout (15 s) or bad JSON | "not read: <reason>" | `--old` word; block shows `failure()` |
| slow | no answer after 4 s (`SLOW_MS`) | "still reading: data.promptugal.news is slow" | `--muted` |
| unknown | no `read_at` | "read time unknown" | `--stale` |
| archive | storm-charles-archive only | "archived <date>" | none |

Colour contrast of these words is in the IPMA-Data proposal's table (all at least 4.6:1 on page and panel, both themes) and is unchanged. Staleness is judged by `read_at` only, never by "the file answered" (analyst: a failed run leaves the previous latest.json in place).

## 5. Accessibility, widths and themes

- **Widths:** every page checked at 390 and 1366 px, 16 px gutters, no horizontal page scroll; wide tables scroll inside `.table-wrap` with a visible edge. Break points: 520 px (forecast columns), 560 px (timelines, insets), 900 px (picker column, map panel beside).
- **Themes:** light and dark from the existing tokens (`site.css`, both `prefers-color-scheme` and `data-theme`). No new colour tokens except `--bar` (= `--muted`, for the archive bars). Text never wears a data colour; levels are always swatch plus word; warning swatches always carry their hatch; `forced-colors` keeps the hatches.
- **Keyboard:** skip link to `#main`; picker filter, then ordinary links; the four-cell warning strip is text, not controls; `<details>` for every collapsible part; the map's roving tabindex as IPMA-Data; visible focus (2 px `--accent` outline, offset 2 px) on every control. After a town change, focus goes to the card's h1.
- **Screen readers:** one h1 per page; each block an h2; the summary and card status are `aria-live="polite"`, announced once per town change, not per file; SVG charts are `aria-hidden` when a table or list carries the same values, else `role="img"` with a label; the picker's swatches add "yellow warning now" to each link's name; distances read "4.1 kilometres".
- **Motion:** none needed; any transition sits under `prefers-reduced-motion: no-preference`.
- **Units and numbers:** always printed (°C, %, mm, km/h, hPa, m, km), tabular figures, Portuguese place names as IPMA writes them.

## 6. Five designs for round 2, under `/d/` (outline)

All five keep the rules unchanged: the disclaimer, the provenance line beside every block, the failure and stale states, the level colours and hatches (a yellow warning is yellow in every design), 390 and 1366 px, light and dark. What changes is type, surface, layout and what leads. None repeats IPMA-Data's five (Broadsheet, Chart room, Night desk, Almanac, Glance). Palettes are bg, surface, ink, muted, accent; contrast measured with WCAG 2 (ink, muted and accent on bg and on surface; the lowest of the six pairs is given).

| # | Name, path | Idea and what it leads with | Light palette | Lowest pair | Dark palette | Lowest pair |
|---|---|---|---|---|---|---|
| 1 | **Postcard**, `/d/postcard/` | One town as a postcard: the place card first and large, the summary sentence as the "message", the sources and terms on the "back" (a flip done with a plain toggle, no animation needed). | #f3ede2, #fffdf8, #2a2420, #6b5f55, #9b3d23 | 5.31 | #1c1714, #26201b, #f1e9df, #b8aa9c, #f0936f | 6.98 |
| 2 | **Timetable**, `/d/timetable/` | Time first: one horizontal 5-day axis with every source as a row (warning spells, forecast days, sea days, UV days, fire days) and each file's read time marked on it, so "what is in force, what comes next, and how old is what we know" share one picture. | #eef1f4, #ffffff, #14202b, #4f5d6a, #1f5fa8 | 5.68 | #0f151b, #18212a, #e6edf3, #9fb0bf, #7cb1ec | 7.25 |
| 3 | **Two towns**, `/d/two-towns/` | Comparison first: two to four place cards side by side on the shared scales (`?id=1110600,1080500`), rows aligned block by block; on phones, swipe-free stacked pairs per block. | #fafafa, #ffffff, #1b1b1f, #5d5d66, #2b4c9b | 6.24 | #141418, #1e1e24, #ececf1, #a3a3ad, #93acf0 | 6.63 |
| 4 | **Workbench**, `/d/workbench/` | The data itself first: each figure shows the JSON path it came from (`cities[12].days[0].t_max_c`) and the file, with "copy as fetch" beside each block; leads with "how to use the raw data". Figures in the monospace stack. | #f4f6f4, #ffffff, #1a1f1c, #56615a, #0f6b5c | 5.90 | #101412, #181e1b, #e3ebe6, #9eaca4, #5cc7b0 | 7.17 |
| 5 | **Large print**, `/d/large-print/` | Reading first: 22 px base, one column, the place card as short sentences, every chart replaced by its table, AAA contrast; for readers with low vision or on small screens outdoors. | #ffffff, #f2f2f2, #000000, #3d3d3d, #0040a0 | 8.37 | #000000, #141414, #ffffff, #d0d0d0, #8ab4ff | 8.82 |

All pairs pass AA (4.5:1); Large print passes AAA (7:1). None of the accents is a data colour (UV extreme is #6a3d9a, RCM 5 #7a1a2c: kept apart). Colour-blind checks of the data colours are inherited, since those do not change; the round 2 proposal must check each design's accent against the level colours under protan and deutan simulation and give button text contrast. Type: system stacks only (Postcard and Large print may use the serif stack `Charter, "Iowan Old Style", Georgia, serif` for headings), no web fonts. The chooser at `/d/` reuses IPMA-Data's card grid (name, line, five swatches, type sample, schematic SVG with no data).

## 7. Order of work for the developer, and cost

1. `provLine()` and the status band (small).
2. `/place/`: picker (static HTML at build plus JS), card blocks, failure states (large: about half the pass).
3. Home: status band, form entry, warnings block, headline rows (medium).
4. Source pages 3.1 to 3.6: reuse IPMA-Data pages with provenance headers, plus the town links (small each).
5. `#storm-live` (medium).

If the pass runs short, cut in this order: geolocation (1.2), "How this card was put together" snippet (1.3.11; keep the join table), MeteoAlarm on the card (1.3.4), the flight-frame row of the storm timeline.

## 8. Decisions for the conductor

- **D1.** Share previews per town: `/place/?id=` gives every town the same link preview. Option: the build also writes 35 small static pages `/place/<slug>/` (town name in title and preview, the same script) that point to `?id=` as canonical. Not in round 1 unless you say so.
- **D2.** The 25 km sea cut-off is a proposal (places.js `SEA_NEAR_KM`); it is labelled as such on the page. Confirm or change.
- **D3.** "Use my location" button: optional, in-browser only. Yes or no.
- **D4.** MeteoAlarm on the place card matches by area name, which fails for the Azores; a static EMMA-to-area table would fix it but needs your approval (analyst's note). Round 1 shows the fallback line.
- **D5.** Islands fire-risk wording: your brief says "no fire-risk data for the islands"; the analyst says "IPMA publishes no fire risk class for the islands". I propose both in one sentence (1.3.9).
- **D6.** The place card reads six card.json files for the terms (about 24 KB more). Keep, or read one IPMA card and say so.
