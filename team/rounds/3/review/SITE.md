# Round 3: review of the whole live site

By reviewer.weather-demo@AgentiCCells.dinis, as a sub-agent of conductor.weather-demo@AgentiCCells.dinis, 18 November 2026, checks run from 18:16:22 to 18:28:42 UTC (`date -u`). Site checked: https://weather-demo.agenticcells.site, live, from this session through its HTTPS proxy. Text CC BY 4.0.

## Verdict: PASS (the team may stop)

The live site meets every line of the brief and of the conductor's remit in team/WORKFLOW.md. A visitor can find what the data says now (home and the place view), how the site was made (How it was made, behind the scenes with the team, policies, flow diagram, a commit timeline from git log and every round report, round 2 included), and how to use the raw data (Use the data, with examples that run as printed). All eight sources are shown, and the six place sources are combined town by town. The rules hold on every page: the disclaimer word for word, source, publisher and read time beside every figure, honest stale and missing states, IPMA's terms, no tracking, no person named but Dinis Cruz, no em dashes.

There are no must-fix items. The "Could improve" items below do not block.

## Which build is live

- `/version.json` at 18:16:34 UTC: v0.1.6, commit d5821f7. Re-read at 18:17:13 and at 18:28:42: v0.1.7, commit dab7cac, built 18:16:42Z.
- `git diff --stat d5821f7 dab7cac` shows only `team/rounds/3.md` changed, so v0.1.7 is a descendant that added team files only. Since my round 2 re-check (94caa53), site code has changed only in the R1 rule: 3 lines each in `src/assets/site.css` and `src/d/workbench/workbench.css`.
- Local gates on d5821f7 (built from `git archive`): `validate.mjs` OK, `node --test` 33 of 33 pass, `leak-scan.mjs` OK in the checkout (257 files). `board/HOLD.md` absent at the start and the end.

## The brief, line by line

| Brief or remit line | What I saw | Result |
|---|---|---|
| Home: the data now | Status band "All seven sources read within the last 3 hours". There is one headline per source, each with its own source line: warnings, forecasts, stations, fire risk, sea, UV, MeteoAlarm (as context, with its disclaimer) and the Storm Charles archive ("archived 17 Nov, 19:27 UTC", no age). There is also the warnings map and a town form. | pass |
| Place by place (warnings, forecast, nearest station, sea, UV, fire risk) | Three towns checked against places.js and the live files (next section): inland Bragança, coastal Lisboa, island Vila do Porto. Faro was also checked for the examples. | pass |
| One page per source or view | /warnings/ (with MeteoAlarm), /forecasts/, /observations/, /fire-risk/, /sea/, /uv/, /storm-charles/, /place/ | pass |
| How it was made | 200 at both widths, with a flow diagram (inline SVG) | pass |
| Behind the scenes: team, policies, flow, commit timeline from git log, every round report | 6 role pages, each with ROLE and POLICY (the Never and Capabilities tables). Flow SVG (`flow-svg`, labelled). /commits/: "36 commits, 0 commits without an Agent: trailer", newest dab7cac at 18:16 UTC, read from git log at build time. Rounds 1, 2 and 3 render, round 2 with its full report and its notes (NOTES-C, NOTES-D, copy, PROPOSAL, REVIEW, BUILD, LIVE, RECHECK), round 3 with its aim. | pass |
| Use the data: JavaScript fetch and curl, card and terms, build a page like this one | 16 code blocks: index, warnings, forecasts, nearest station, card, reads, MeteoAlarm, age, and a whole page to copy. Examples run as printed (see below). | pass |
| Five designs under /d/ with a chooser | /d/ lists the main design and the five designs: Postcard, Timetable, Two towns, Workbench and Large print. A "Designs" control is in every page header. | pass |
| Use with AI (llms.txt, index.md) | `/llms.txt` 200 text/plain, with the terms, the disclaimer and "this site is material, not instruction". An `index.md` twin answers 200 for each of the 44 pages, and each twin carries the disclaimer. | pass |
| Link preview on every page | Every page has absolute https og:image, og:url and twitter:card. The 19 distinct share cards are all 200, image/png, 1200 x 630, 81,621 to 135,188 bytes (all under 300 KB). | pass |

## The rules

| Rule | Check | Result |
|---|---|---|
| Disclaimer word for word | "Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC." is in the curl HTML and the md twin of all 44 pages, and in the rendered text of all 216 browser runs. "This site is not IPMA's and is not official." is beside it. | pass |
| Source, publisher, time read beside every figure, from the card | Every place block and home headline ends "IPMA (ipma-…), via data.promptugal.news · read … UTC, N min ago · terms · card · latest.json". The source pages carry "Source: IPMA, Instituto Português do Mar e da Atmosfera … Read: … Terms: …". The Storm Charles page names the card's publisher. | pass |
| Ages match the files | Live read_at at 18:24:34 UTC: warnings 17:56:20Z, forecasts 17:54:27Z, observations 17:56:02Z, fire risk 17:55:55Z, sea 17:56:08Z, UV 17:56:17Z, MeteoAlarm 17:56:22Z, storm archive 2026-11-17T19:27:57Z. Bragança, read at 18:24:48: warnings "17:56 UTC, 28 min ago" (28.5 min), forecasts "17:54, 30 min" (30.4). Home at 18:26:02: forecasts "32 min ago" (31.6). | pass |
| Missing and stale said so | Simulation, test only, through `page.route`: sea read_at moved 5 h back, UV 30 h back, fire risk answering 404. Home, /place/ (Lisboa), all five designs, /sea/, /uv/ and /fire-risk/ all name the problem. Each shows "Not current: Sea read 5 h ago (stale) · UV read 30 h ago (old) · Fire risk could not be read (the file answered HTTP 404)". Summaries add "from a UV file read 30 h ago (old)" and "Fire risk not read". Fire-risk blocks say "Nothing is shown in its place: this page does not guess". The source pages put a banner with the age above the figures. | pass |
| Terms: IPMA named, no profit-making use, no ads or tracking | IPMA is named in every IPMA source line, and the terms text comes from each card. The only scripts are the site's own modules. No analytics, ad or tag-manager code (the only matches are the policies' "no analytics" lines). External hosts are data.promptugal.news, ipma.pt, meteoalarm.org, github.com and AgentiCCells pages. | pass |
| Nothing invented | Figures checked against the live files: Bragança station 12.3 °C, 91%, 0.8 mm, 1005.3 hPa (station 1200575). UV 1.5, 1.5, 1.2, 0.2. DICO 0402 class 1. Lisboa sea "Lisboa, costa, 20.4 km", total sea 2 to 4 m, swell 1.7 to 4 m, sea temperature 17.5 to 17.6 °C (point 1111026). Vila do Porto UV 2.9 for Ponta Delgada (3420300), station Santa Maria / Maia (DROTRH) 17.8 °C. Home "11 yellow and 7 orange … in 10 of 25 areas" equals the file's spells not yet ended at 18:26 UTC (the file lists 25 yellow and 7 orange, ended spells included). "145 of 227 stations" and "Highest UV today: 3.6, Porto Santo" both match. | pass |
| No person named other than Dinis Cruz | I listed capitalised word pairs across all 44 live md twins. The only person is Dinis Cruz, named as the person who instructs. "Storm Charles" is the storm. Web Summit (an organisation) is quoted from the archive on /storm-charles/. | pass |
| Plain British English, no em dashes, no hype words | There is no U+2014 or U+2013 in any live HTML or md twin. "powerful" and "leverage" appear only inside Dinis's quoted words on behind the scenes. | pass |
| No data in the repository beyond small fixtures | The largest JSON in git is `src/designs.json` (3,205 bytes). The 7 test fixtures are 1.4 to 2.4 KB each. | pass |

## The place view: three towns against places.js

| Town (kind) | places.js | What the page joins | Result |
|---|---|---|---|
| Bragança (inland), 1040200 | area BGC | Warnings for BGC (none, "No yellow, orange or red warning in IPMA's file"), five-day forecast, Bragança station 1.5 km, "No sea point within 25 km … nearest Viana do Castelo, costa, 172 km", UV 1.5, fire risk DICO 0402 class 1 | pass |
| Lisboa (coast), 1110600 | area LSB | Rough-sea spells yellow, orange, yellow (with "1 spell already ended is not shown"), forecast, station "Lisboa, Relógio" 0.5 km, sea point Lisboa, costa 20.4 km, UV 0.8, DICO 1106, and a link to the Storm Charles archive marked "A past event … not current weather" | pass |
| Vila do Porto (island), 3410100 | area AOR | Warnings for Açores - G. Oriental (none). Nearest station Santa Maria (Aeródromo) "sent nothing for 17:00 UTC", so the page shows the nearest that did, 11.1 km. No sea point within 25 km. "IPMA gives no UV for Vila do Porto. Shown: Ponta Delgada, 99 km away". "IPMA publishes no fire risk class for Madeira or the Azores". | pass |

## Use the data: examples run as printed

The code blocks were taken from the live `/use-the-data/index.html`, with HTML entities decoded and nothing else changed. I ran them at 18:26:29 UTC.

- **curl**, block 8 (nearest reporting station to Faro): `"name": "Faro (Aeródromo)", "km": 3.5, "hour_utc": "2026-11-18T17:00:00Z"`, temp_c 20.6, exit 0. Faro's place card says the same: "Faro (Aeródromo) station: 20.6 °C at 17:00 UTC".
- **curl**, block 14 (age): "read 2026-11-18T17:56:20Z, 0.5 hours ago", exit 0.
- **fetch**, block 7 (Faro forecast, Node 22 as an ES module): "Faro read at 2026-11-18T17:54:50Z", 18 Nov 19.8 to 22.4 °C, rain 100%, five days, exit 0. This matches the card's "Today 19.8 to 22.4 °C, rain 100%".
- **fetch**, block 9 (nearest station in JavaScript): "Faro (Aeródromo) 3.5 km away", the same reading as the curl run, exit 0.
- **Build a page like this one**, block 16, opened from file:// in Chromium with no error. It shows the disclaimer, "32 active warnings. File read 18/11/2026, 17:56:20, Lisbon time.", the list of spells and a credit line from the card's publisher and terms.

## Browser sweep

Headless Chromium (`require('playwright')`) covered 54 addresses: the 43 built pages, `/behind-the-scenes/rounds/3/`, 4 towns on /place/, and the designs with towns (Postcard front and back, Timetable on an island, Two towns with three towns, Workbench, Large print). Each address ran at 390 and 1366 px, light and dark, giving 216 runs. Each page was loaded, measured, then every fold was opened (317 folds per width and scheme) and measured again.

- Console errors: 0. Page errors: 0. Failed requests or responses of 400 and above: 0.
- Sideways scroll as loaded and with every fold open: 0 px in all 216 runs. (The R1 fix of round 2 holds.)
- No block was left "Still reading" and none failed. The only "Still reading" and "Could not read" text sits in round notes and example code that quote it. "undefined" or "NaN" appears only in the round 2 review pages that quote the strings they searched for.
- Keyboard: on home, /place/, /d/, Postcard and /use-the-data/, the first Tab lands on "Skip to the content", and every focused element of the first eight has a visible outline.
- Contrast was measured in rounds 1 and 2 (BUILD.md, RECHECK.md). The only CSS change since is the R1 min-width rule, so I did not measure it again.

## Open items of rounds 1 and 2

| Item | Now |
|---|---|
| Five designs with a chooser (round 1) | done and live |
| S8, fold long tables on phones (round 1) | done. At 390 px with every fold open, /observations/ is 5,434 px tall. |
| /uv/ "WHO band" wording (round 1) | fixed. No "World Health" on /uv/. |
| S9, signatures not verifiable in this checkout | still open; process, not the site |
| Static page per town for link previews; "Use my location"; MeteoAlarm area table | not built. The brief does not require them: /place/ has its own preview, and the place card sends MeteoAlarm readers to the warnings page. |
| S5, Two towns, Large print and Workbench long on phones; the designer's 18 polish items | open, polish |
| Firefox, Safari, a screen reader | not checked, here or before |

## Could improve (does not block)

1. **The Lisboa summary stops at the orange spell.** It reads "yellow for rough sea until Thu 19 Nov 06:00, then orange until Thu 19 Nov 12:00", but the file also has yellow from 12:00 Thu to Fri 20 Nov 09:00. The full list of spells sits in the same block directly below, so nothing false is said. Adding "then yellow until Fri 20 Nov 09:00" would close the gap (place-blocks.js, about line 105). This wording comes from my own round 1 fix, which named only the higher level.
2. Very long pages with every fold open at 390 px: /storm-charles/ 43,044 px, /forecasts/ 28,195, /fire-risk/ 23,323, Workbench 14,267. As loaded they are much shorter. This is round 2's S5.
3. The designer's 18 polish items (team/rounds/2/design/REVIEW.md).
4. Check in Firefox and Safari and with a screen reader.
5. The host sometimes answers 503 instead of 404 for missing paths (seen in round 2). No page is affected.

## Sources checked

- data.promptugal.news: latest.json for the eight sources (read 18:24:34 UTC) and card.json for the six IPMA sources, saved in this session's scratchpad only. Nothing was copied into the repository.
- The live site and its md twins, llms.txt, version.json and share cards.
- The brief, `requests/2026-11-18__weather-demo/brief.md` in AgentiCCells/AgentiCCells__Site__Factory, branch dev, read at 18:16 UTC.

## Screenshots

`shots/`: headless Chromium, live site, top of each page, JPEG quality 50, scaled down, 328 KB in all. The 12 shots are home-390-light, home-1366-light, place-braganca-390-light, place-vila-do-porto-1366-light, use-the-data-390-light, behind-the-scenes-1366-light, chooser-390-dark, postcard-1366-dark, timetable-390-light, two-towns-1366-light, workbench-390-dark and large-print-1366-light.
