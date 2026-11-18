# Round 2: review of the live round 1 site

By reviewer.weather-demo@AgentiCCells.dinis, as a sub-agent of conductor.weather-demo@AgentiCCells.dinis, 18 November 2026, checks run from 17:23:44 to about 17:31 UTC (session clock). Site checked: https://weather-demo.agenticcells.site, from this session, through its HTTPS proxy. Text CC BY 4.0.

## Verdict: PASS

The live site is round 1's build. Every page answers 200, the disclaimer is on every page and twin, live data loads from the deployed origin with no console or page error, read times and ages match the live latest.json files, every link preview is an absolute https URL that answers 200, nothing overflows at 390 px, and three curl examples copied from the live /use-the-data/ page ran as printed and gave the same values as the place card. No must-fix item. Notes below are for information.

## Which build is live

- `/version.json` at 17:23:44 UTC: v0.1.4, commit b4694f2, built 17:11:07Z. Re-read at 17:28: v0.1.5, commit d78a3d2, built 17:24:01Z. The deploy changed while I was checking.
- Both are descendants of 84d7d3b that add only team files: `git diff --stat 84d7d3b b4694f2` is `team/rounds/2.md` only; f4053f1 and d78a3d2 add `team/rounds/2.md` and `team/rounds/2/design/`. So the site code is round 1's.
- I built b4694f2 locally (`git archive` into a scratch folder, `node scripts/build.mjs`) and compared it with every live page, twin, script, stylesheet, JSON and share card fetched with curl. Outside `/behind-the-scenes/`, the only difference is the version stamp ("dev" locally, "v0.1.5" live) and `version.json`. The behind-the-scenes pages differ because live carries the round 2 decisions (d78a3d2).

## Checks and results

| Check | Result |
|---|---|
| Every page answers 200 | 29 pages: `/`, `/place/`, `/warnings/`, `/forecasts/`, `/observations/`, `/fire-risk/`, `/sea/`, `/uv/`, `/storm-charles/`, `/use-the-data/`, `/how-it-was-made/`, `/use-with-ai/`, `/behind-the-scenes/` with `commits/`, `rounds/1/` and its 7 notes, `rounds/2/` and 6 team pages. Plus `/place/?id=` for five towns: Faro 1080500, Lisboa 1110600, Aveiro 1010500, Bragança 1040200, Vila do Porto 3410100. All 200 in curl and in Chromium. |
| index.md twins, llms.txt, version.json | All 29 `index.md` 200; `/llms.txt` 200 text/plain (67 lines); `/version.json` 200 application/json. `/assets/favicon.svg` 200. |
| Disclaimer | "Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC." in the rendered text of all 34 addresses at both widths, and "This site is not IPMA's and is not official." on each. Word for word in all 29 live `index.md` twins and in `llms.txt`. No U+2014 or U+2013 in any downloaded live file. |
| Live data and CORS | Headless Chromium (`require('playwright')`), 68 loads (34 addresses at 390 and 1366 px): no console error, no page error, no failed request, no response of 400 or above. Every request to data.promptugal.news answered 200 with `access-control-allow-origin: *` (home: 16 requests; place view: 12; source pages 2 to 7). No block left reading and no failure message; the only "Still reading" and "Could not read" text found is quoted in the round notes and in the example code on /use-the-data/. |
| Read times and ages | See the next section: all match. |
| Link previews | Every page has og:image, twitter:image and og:url as absolute https URLs on weather-demo.agenticcells.site, and twitter:card. 13 distinct share cards, each 200, image/png, 1200 x 630, 92,039 to 135,188 bytes. og:url and canonical agree on every page. The place view keeps `og:url` `/place/` for every town (the page is static; the town comes from the query), which is acceptable. |
| 390 px | No horizontal page overflow on any of the 34 addresses (scrollWidth equals the viewport). |
| Use the data, curl | See below: three blocks run as printed. |

## Read times and ages against the live files

Files fetched at 17:28:32 UTC (`fetch` in Node), each `latest.json` 200:

| File | read_at |
|---|---|
| ipma-warnings | 16:32:26Z |
| ipma-city-forecasts | 16:30:33Z |
| ipma-observations | 16:32:08Z |
| ipma-fire-risk | 16:32:01Z |
| ipma-sea | 16:32:14Z |
| ipma-uv | 16:32:23Z |
| meteoalarm-pt | 16:32:28Z |
| storm-charles-archive | 2026-11-17T19:27:57Z |

- Home at 17:28:36 and Faro's place view at 17:28:38: each block's source line gives "read 18 Nov, 16:32 UTC, 56 min ago" (forecasts 16:30, 58 min; fire risk 57 min). 16:32:26 to 17:28:36 is 56.2 minutes; 16:30:33 to 17:28:38 is 58.1; 16:32:01 to 17:28:38 is 56.6. All match.
- Source pages at 17:29:01 to 17:29:08: "Read: 18 Nov 2026, 16:32 UTC (read 57 min ago)" on warnings, observations, UV, sea and fire risk; forecasts lists each city's own read time ("Read 16:30:46 UTC"), and 16:30:46Z is in the file.
- Storm page: "Once, on 17 November 2026 at 19:27:57 UTC (read_at)", as the file; no age shown, correct for an archive.
- Lisboa place band at 390 px: "All six files read within the last 3 hours (oldest 55 min ago)" (screenshot `live/place-lisboa-390.jpg`).
- Nothing was stale, so nothing should have been marked: the site calls a file stale past 3 hours (`STALE_MIN = 180` in `src/assets/js/data.js`). Note: the collector's 17:17 run had not happened by 17:30 (`ipma-warnings/reads.json`, newest run 16:32:26Z), so these files will turn stale at about 19:32 UTC if it stays silent. That is the data site's gap, not the demo site's, and the site is built to show it.

## Figures spot-checked

- Faro place summary (17:29:48): "yellow for rough sea until Fri 20 Nov 09:00 ... Today 19.8 to 22.4 °C, rain 100%. Faro (Aeródromo) station: 21.3 °C at 15:00 UTC. UV 2.4 (low). Fire risk class 1 (low)." Forecast and station match the curl runs below; UV 2.4 is Faro's 18 Nov value in ipma-uv.
- Lisboa: rough sea yellow to Thu 19 Nov 06:00 then orange to 12:00, rain yellow to 18:00 today; UV 0.8 (file: 0.8). Aveiro: yellow until 18:00 today, then orange until Fri 20 Nov 00:00. Bragança: no warning, UV 1.5 (file: 1.5), station 14.3 °C. Vila do Porto: UV 2.9 for Ponta Delgada, station Santa Maria / Maia (DROTRH) 17.8 °C. These are the round 1 review's figures (fixes M1 and S1 are live).

## Use the data: curl run as printed

The code blocks were taken from the live `/use-the-data/index.html` (HTML entities decoded, nothing else changed) and run with bash at 17:29:25 UTC:

- Block 7, nearest reporting station to Faro (37.0146, -7.9331): `"name": "Faro (Aeródromo)", "km": 3.5, "hour_utc": "2026-11-18T15:00:00Z"`, temp_c 21.3, exit 0. Same station, distance and temperature as Faro's place card.
- Block 5, Faro forecast: read_at 2026-11-18T16:30:56Z, 18 Nov 19.8 to 22.4 °C, rain 100%, five days, exit 0. Same as the place summary.
- Block 13, age check: "read 2026-11-18T16:32:26Z, 0.9 hours ago", exit 0.

## What differs from the local build

- Site code: nothing beyond the version stamp (see "Which build is live").
- Behind the scenes: live is ahead of b4694f2 by the round 2 design proposal and decisions (team files), as expected.
- Not live yet: local HEAD 227909f (writer, 17:23:59 UTC, not on origin/dev) changes the /uv/ lede. Live `/uv/` still says each cell "is coloured by the World Health Organization's band for it", the S1 leftover from the round 1 re-check (may wait). The working tree also holds uncommitted round 2 work (designs, place blocks, headlines); none of it is on the live site.
- Host: missing paths such as `/robots.txt` and `/favicon.ico` sometimes answer 503 from the host's cache instead of 404 (a retry gave 404 for `/robots.txt`). The site declares `/assets/favicon.svg`, which answers 200, so no page is affected. For information only.

## Not checked here

Keyboard, contrast, dark scheme and the failure states (made-stale and missing files) were checked on the same code in round 1 (BUILD.md, RECHECK.md); the live code is unchanged, so I did not repeat them. Signatures were not verified in this checkout.

## Screenshots

`live/` (headless Chromium, live site, JPEG quality 55, about 360 KB in all): `home-390.jpg`, `home-1366.jpg`, `place-lisboa-390.jpg`, `place-aveiro-1366.jpg`, `warnings-390.jpg`, `use-the-data-390.jpg`.
