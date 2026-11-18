# Round 1 data notes: weather by place

By analyst.weather-demo@AgentiCCells.dinis, 18 November 2026. For the designer and the developer of the town view: what each source holds for a place, how sources join by place, what data.promptugal.news's own by-place files are, and the failure states. Builds on the IPMA-Data cell's round 1 notes (field meanings, units and quirks read at about 10:11 UTC); this file says where things changed by 16:21 UTC and adds the joins. Code: `src/assets/js/places.js`; tests: `tests/places.test.mjs`.

## What I read, and when (all UTC, 18 November 2026)

| File | Read at | Note |
|---|---|---|
| `https://data.promptugal.news/llms.txt`, `api/v1/index.json`, `api/v1/openapi.json` | 16:21:10 | index.json `built_at` 16:14:19Z, version v0.1.38. openapi.json is 312,750 bytes, 32 paths. |
| `api/v1/<id>/{latest,reads,card}.json` for the eight sources | 16:21:10 to 16:21:13 | All 200, except `storm-charles-archive/reads.json`: HTTP 404 (a GitHub Pages "not found" page), although llms.txt lists it. index.json gives `reads: null` for that source. |
| `api/v1/by-place/now/index.json` and the files for albufeira, algarve, faro, loule, portimao, tavira, vila-do-bispo | 16:21:23 | |
| `api/v1/events/by-place/index.json` | 16:21:23 | Not weather; checked only to say what the key is. |
| `api/v1/README.md` (the contract) | 16:23 | Promises the by-place paths stable for v1. |
| `storm-charles.promptugal.news/api/v1/2026-11-10-storm-charles/weather/warnings.json` (headers only) | 16:23 | 200, `access-control-allow-origin: *`. |
| gzip transfer sizes of the seven current latest.json files | 16:25 | See "For the developer". |

The cards' `vault` blocks carry a public sgit read key; nothing from them is quoted here or in the fixtures.

## Freshness at the read

Every current source's latest.json had `read_at` between 16:11:56Z and 16:13:52Z, so 8 to 10 minutes old at 16:21: fresh under data.js (stale over 180 min, old over 24 h).

**Cadence** (reads.json, all seven current sources alike): 39 collector runs from 17 Nov 19:40 to 18 Nov 16:13. The longest gap is still 7 h 15 min (02:28 to 09:43 overnight). Since 13:06 the runs come every 3 to 15 minutes (pushes to the data site's branch, not the schedule): this is a busy afternoon, not the normal rate. The cards still say "hourly, at 17 minutes past each hour"; no run in the log is at :17. Expect "stale" overnight, and show it.

**First recorded failure**: the 15:06 run of ipma-warnings failed (`status: "error"`, `error: "UND_ERR_CONNECT_TIMEOUT"`, `changed: null`) reading IPMA's `warnings_www.json`; the 15:10 run succeeded. Each of the six IPMA sources has 1 failed run of 39 (reads.json); meteoalarm-pt 0. So a failed run does not leave an error in latest.json: the previous latest.json stays, and only its age shows the miss. The page must judge freshness by `read_at`, never by "the file answered".

**index.json headline wording**: ipma-warnings says "32 active warnings in 25 areas"; 25 is every area (`counts.areas`), not the areas with a warning (13 at the read). Do not reuse that headline.

## Per source

Publisher, licence and attribution are from each card's `publisher` and `terms` (read 16:21). The six IPMA cards are identical in `terms`: summary "IPMA: free to copy and use for personal or public use if the use has no profit-making or offensive purpose; always name IPMA as the source", page https://api.ipma.pt/, read by the data site on 2026-11-17, with IPMA's Portuguese quote. Each card's `split.people` says no person has checked the values yet (not reviewed). Every latest.json also carries `license` (CC BY 4.0, holder PrompTugal.news, for the file's structure) and `provenance` {source, page, read_at, by, terms}.

### ipma-warnings (read_at 16:13:49Z): join by warning area code

- Fields: `counts` {active 32, by_level {yellow 25, orange 7}, green 200, areas 25}; `active[]` {area, area_name, type, type_pt, level, start, end, text}. Times are Portugal local time with no zone (`2026-11-18T13:15:00`); show as given.
- At 16:21 Lisbon time, 13 areas had a spell in force: AVR, BJA, BRG, CBO, CBR, FAR, LRA, LSB, PTG, PTO, STB, STM, VCT; latest `end` 2026-11-20T12:00. All other areas: no yellow, orange or red in IPMA's file (green).
- Join: `area` = the place's warning area (`PLACES[].area`). An area absent from `active[]` is green, not missing; a missing file is missing.
- Missing: past warnings (reads.json holds no values); the real onset of a first spell (clipped to IPMA's issue time); English text.

### ipma-city-forecasts (read_at 16:11:56Z): join by globalIdLocal

- Fields per city: `id` (globalIdLocal), `name`, `area` (warning area code), `lat`, `lon`, `source`, `read_at`, `updated` (IPMA's dataUpdate, no zone; 2026-11-18T15:31:02 for all 35 at this read), `days[5]` {date, t_min_c °C, t_max_c °C, rain_prob_pct %, weather_type, wind_dir, wind_class, rain_class (null on days IPMA gives no class)}.
- 35 places: 18 district capitals; Guimarães, Sagres, Portimão, Loulé, Penhas Douradas, Sines; Funchal, Porto Santo; nine Azores seats. No place in MCN or MRM (Madeira's north coast and mountains).
- This file is the source of the place table: it carries both the globalIdLocal and the warning area for each place, so the place-to-area join is IPMA's own (`distrits-islands.json` `idAreaAviso`), not ours.

### ipma-observations (read_at 16:13:32Z, hour_utc 15:00Z): join by nearest station

- Fields per station: `id`, `name`, `lat`, `lon`, `reading` {temp_c °C, humidity_pct %, wind_kmh km/h, wind_dir_id (0 no direction), rain_mm mm in the hour, pressure_hpa hPa, radiation_kj_m2 kJ/m²} or **null when the station sent nothing that hour (59 of 227 at this read)**. Fields inside a reading can be null too (Loulé (CML) and Portimão (Aeródromo) had `temp_c: null`).
- Join: nearest station by haversine. For all 35 places the nearest station is within 7.5 km (Madalena to Pico (Aeródromo); computed at 16:21 from this file). `findStation()` returns the nearest station and the nearest one with a reading: for Portimão the nearest (Praia da Rocha, 3.8 km) was silent and the nearest reporting one was Portimão (Aeródromo), 5.4 km; for Lisboa 0.5 km against 5.0 km; for Vila do Porto 2.7 against 11.1 km.
- Caution for the designer: a station's `reading` can exist and still lack temperature. Show each value or a dash, never fill one from another station.

### ipma-sea (read_at 16:13:37Z): join by nearest coastal point

- Fields per coast: `id`, `name`, `area`, `lat`, `lon`, `days[3]` {date, waves_min_m/waves_max_m (IPMA's swell height), wave_period_min_s/max_s, wave_dir, sea_min_m/sea_max_m (IPMA's total sea, significant wave height), sea_temp_min_c/max_c}. 12 points. IPMA's `dataUpdate` is dropped.
- Join: nearest point. Within 25 km for every coastal place with its own point (Vila do Corvo 23.4 km is the farthest); Setúbal 39.4 km and Coimbra 39.7 km; inland places are far (Bragança 172 km, Portalegre 157 km). Some islands get another island's point (Angra do Heroísmo: Horta coast 109 km; Vila do Porto: Ponta Delgada coast 120 km). `findSea()` returns `near: false` beyond `SEA_NEAR_KM` = 25 (a proposal).
- Do not join sea points by their `area`: Porto Santo's coast is labelled MCS and Flores's ACE in IPMA's own file.

### ipma-uv (read_at 16:13:47Z): join by globalIdLocal, then nearest

- Fields per place: `id` (globalIdLocal), `name` (null where IPMA's place list has none), `days[]` {date, index, period (always 10), hours (always null)}. **No coordinates.** 28 ids; at this read 5 days each (18 to 22 Nov; 4 days at 10:11).
- Quirks still present: id 0 (no place, 50 rows: ten a day); id 1081525 (no name in any file read; its digits suggest district 08 municipality 15, Vila do Bispo, but that is an inference, not a fact a file states); Aveiro, Leiria and Santarém with two values per day.
- Join: the place's own id when the UV file has it (26 of 35 places); else the nearest place of the table whose id is in the UV file, using the table's coordinates. Loulé gets Faro (15.9 km), Portimão gets Faro (54.2 km), Sagres gets Faro (89.4 km), Vila do Porto gets Ponta Delgada (99 km). Show the place the value belongs to and the distance. Never match id 0 or 1081525.

### ipma-fire-risk (read_at 16:13:24Z): join by DICO

- Fields: `files[3]` {d, date (18 to 20 Nov), run, file_date}; `municipalities[278]` {dico, lat, lon, days[3] {date, rcm 1 to 5, level}}. All 278 at class 1 ("low") today (`counts.today_by_level`). Mainland only, no names.
- Join: the DICO code is digits 2 to 5 of a mainland globalIdLocal (1 080 800 Loulé: 0808). Checked at 16:21: all 24 mainland places' codes exist in the file; for 22 the municipality point is the place's own position, Sagres 7.8 km and Penhas Douradas 2.4 km off (villages, not seats). No fire risk for Madeira and the Azores: say "IPMA publishes no fire risk class for the islands", not "no risk".

### meteoalarm-pt (read_at 16:13:52Z): context, join by area name

- Publisher (card): "MeteoAlarm (EUMETNET), from IPMA". Terms (card, read 2026-11-11, not re-read): name the national service (IPMA), keep the time of issue, link www.meteoalarm.org, publish MeteoAlarm's disclaimer; latest.json `attribution` carries all four.
- 58 messages, 32 not expired at 16:21 (`expires_utc` compared with now); oldest `sent_utc` 2026-11-13T01:32:18Z. Levels yellow 51, orange 7; hazards "Rain" 34, "coastalevent" 24. Times UTC.
- Areas use MeteoAlarm's EMMA ids (PT001 Açores - Grupo Ocidental, PT002 Grupo Central, PT005 Beja ... PT022 Braga); the mainland names match IPMA's area names, the Azores names are written out in full. No join table is in codes.js yet: a mapping by name would be a static table for the conductor to approve.
- How to show it honestly: as "the same warnings as relayed by MeteoAlarm", a second view of IPMA's warnings with English text, never as a second source that confirms them. Show only messages not yet expired, each with its time of issue, the disclaimer and the link.

### storm-charles-archive (read_at 2026-11-17T19:27:57Z): past event, not by place

- Publisher (card): "storm-charles.promptugal.news (the Storm Charles incident team)". Terms: the storm site's own data, Apache-2.0; quoted sources keep their own terms. Cadence: `once` (archived on 17 November).
- What it holds: a manifest, not values. 142 files in 39 datasets (5,127,487 bytes), each with `url`, `bytes`, `sha256_prefix` and `verified` (142 of 142). Twelve are weather files (`weather/warnings.json`, `cap.json`, `forecast.json`, `stations.json`, `madeira.json`, `lisbon-rain.json` and others) at storm-charles.promptugal.news, which answers with CORS open. The incident is "Storm Charles, Lisbon", 10 to 12 November 2026, Lisbon and Madeira.
- How to show it honestly: as a dated archive of a past storm, linked from Lisboa and Funchal ("a storm archive for this place, 10 to 12 November 2026"), never mixed into the current view. Do not run data.js `staleness()` on it: its read_at is already 21 hours old and turns "old" tomorrow, which would be a false alarm for a file that is meant to be fixed.
- reads.json is 404; no collector history exists for it.

## data.promptugal.news by_place: what it is

- `index.json` `by_place`: an array of 18 URLs, `api/v1/by-place/now/<place>.json`, for Algarve places only: albufeira, alcoutim, algarve, aljezur, castro-marim, faro, lagoa, lagos, loule, monchique, olhao, portimao, quarteira, sao-bras-de-alportel, silves, tavira, vila-do-bispo, vila-real-de-santo-antonio. `by_place_index` is the URL of `by-place/now/index.json` (4,146 bytes): the same 18 as {id, name (the slug), url, read_at}, no coordinates. `events_by_place_index` is the events-pt site's per-place event lists (not weather).
- **Yes, a by-place file joins the sources by place**: each (about 4.7 to 6 KB) has `station` {name, id, km, reading}, `forecast` {place, id, km, days[5] with t_min_c, t_max_c, rain_prob_pct, weather_type}, `warnings` {area as text "FAR (the Faro district)", active[]}, `fire_risk` {municipality DICO, days[3] level only}, `uv` {place, date, index}, `sea` {coast, date, waves_max_m, sea_max_m, sea_temp_max_c}, `airport` (adsb.lol flights near Faro, under ODbL) and `reads` (the time each source was read). `algarve.json` is a summary of the others.
- **It is not enough for this site:**
  1. It covers 3 of our 35 places (Faro, Loulé, Portimão; Sagres only as vila-do-bispo). Nothing outside the Algarve.
  2. Its `uv` is not today's: every file read gives the last day of the UV file (`date: "2026-11-22"`, Faro index 3) rather than 18 Nov (Faro 2.4).
  3. It names UV id 1081525 "Sagres" (vila-do-bispo.json, index 2.9, which matches 1081525's 22 Nov value); no IPMA file read names that id.
  4. It keeps one day of sea (max values only), fire risk as a label without the class number, and the nearest station even when it is silent (albufeira.json: `reading: null`, no fallback). Tavira's "forecast" is Faro's, 28 km away.
  5. It carries no `read_at` per source beyond `reads`, and it is built from the same latest.json files, so it is never fresher than they are.
- **How the town view should use it**: not as its data source. Join from the six per-source files for every place (places.js does this the same way for all 35). Where `byPlaceFor()` finds a file, a "see also" link is fine. Points 2 and 3 are worth passing to the data site's owner (a draft; this cell contacts no one).

## The joins at a glance

| Source | Key in the file | Place key | Kind of join | Static part (in places.js) |
|---|---|---|---|---|
| ipma-warnings | `active[].area` | `PLACES[].area` | exact | area per place, from ipma-city-forecasts `cities[].area` (IPMA's `idAreaAviso`) |
| ipma-city-forecasts | `cities[].id` | `PLACES[].id` | exact | the ids |
| ipma-observations | `stations[].lat/lon` | `PLACES[].lat/lon` | nearest (and nearest reporting) | none |
| ipma-sea | `coasts[].lat/lon` | `PLACES[].lat/lon` | nearest, `near` within 25 km | none |
| ipma-uv | `places[].id` | `PLACES[].id`, else nearest UV place by the table's positions | exact or nearest | positions of UV places (same table) |
| ipma-fire-risk | `municipalities[].dico` | digits 2 to 5 of `PLACES[].id` | exact, nearest as fallback | the rule only |
| meteoalarm-pt | `messages[].area` (name), `emma` | warning area name | by name (not built) | none yet |
| storm-charles-archive | none | Lisboa, Funchal by hand | link only | none |

## For the designer

- One town card, six blocks, each with its own source line and read time: warnings (area name from codes.js, level colour, spells with Portugal times), forecast (five days), "nearest station: <name>, <km> km" with the hour (UTC), sea ("<coast>, <km> km", or "no sea point within 25 km; the nearest is ..."), UV ("for <place>, <km> km" when not the town's own), fire risk (by municipality; islands: "IPMA publishes no fire risk class for the islands").
- Distances are part of the truth: always show which station, coast or UV place a value belongs to and how far.
- Silence is a state: a station with no reading, a reading with no temperature, an area with no warning (green), a source not read. Each needs its own words; none may look like zero.
- MeteoAlarm: a secondary panel under the warnings, English text, time of issue, disclaimer. Storm Charles: a dated link for Lisboa and Funchal, outside the "now" view.

## For the developer

- **Minimum fetches for the town view: six latest.json files**: ipma-warnings, ipma-city-forecasts, ipma-observations, ipma-fire-risk, ipma-sea, ipma-uv. Transfer at 16:25 with gzip: 1.2 + 4.7 + 9.7 + 4.0 + 2.0 + 1.9 KB, about 24 KB (uncompressed about 238 KB). `cache-control: max-age=600`, CORS open. Fetch all six once, in parallel, with data.js `getJSON()`; switching towns needs no new fetch. Add meteoalarm-pt (3.8 KB gzip) only when its panel is open. Cards are needed for the terms line (about 4 KB each); one IPMA card is enough for the six IPMA sources' terms, but the provenance box reads each source's own.
- Call `joinPlace(place, { warnings, forecasts, observations, fire, sea, uv })` with the bodies (or null for a failed read). Each part comes back as `{ source, read_at, value }` or `{ ..., missing: true }`.
- Failure states to handle, per block:
  1. File not read (network, HTTP error, timeout, bad JSON): `missing: true`; show data.js `failure()` for that block only; the other five still show.
  2. File read but stale or old: data.js `ageBanner()` per block, by that file's `read_at` (sources can differ by minutes or, after a failed run, by hours).
  3. Read but no match: warnings `[]` (green, not missing); fire risk null on the islands; UV with no exact id (show the nearest and its distance); sea `near: false`.
  4. Station: `reporting` null (no station reporting at all: say so); `reporting` differs from `nearest` (name both); single values null inside a reading.
  5. Content older than the read: forecast `updated` over 14 hours old, observations `hour_utc` over 3 hours old, warnings whose `end` has passed, UV and forecast days before today (Lisbon date), as the IPMA-Data notes propose.
  6. Shape change: if a key places.js reads is absent, the join returns null; treat as "could not match", not as a value.

## Files written this round

- `src/assets/js/places.js`: `PLACES` (35), `haversineKm`, `nearest`, `findForecast`, `findWarnings`, `findStation`, `findSea`, `findUV`, `dicoOf`, `findFireRisk`, `joinPlace`, `slug`, `byPlaceFor`, `SEA_NEAR_KM`.
- `tests/places.test.mjs`: 12 tests (table, areas exist in codes.js and match the forecast fixtures, haversine, nearest, station with silent fallback, islands, sea, UV, fire risk, joinPlace, by-place lookup).
- `tests/fixtures/places-algarve.json`: 2,423 bytes, cut from the 16:11 to 16:13Z latest.json files (five stations, two coasts, three UV ids, four municipalities, four cities; readings and days trimmed), no card content.
- The six round 1 fixtures were not refreshed: the shapes are unchanged (same keys at 16:21 as at 10:11).
