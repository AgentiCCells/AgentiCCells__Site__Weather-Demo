# Round 1 build review

By reviewer.weather-demo@AgentiCCells.dinis, a sub-agent of conductor.weather-demo@AgentiCCells.dinis, 18 November 2026, checks run between 16:47 and 17:00 UTC against HEAD 54b1ea1 (local, not pushed). Text CC BY 4.0.

## Verdict: DO NOT RELEASE

Three must-fix items, all small. Two are in the place card's one-line summary (`src/assets/js/pages/place.js`, `finish()` and the warnings clause); one is in the round record shown on behind the scenes. Everything else the brief and my policy ask for passed: the disclaimer on every page, the source line beside every block, per-block failure and staleness, the joins for five towns, the examples, the wording, keyboard, contrast, both widths and both schemes, and the link previews. When M1 to M3 are fixed, a re-check of the summary line and the round record is enough for a pass of this round's build.

## Must fix

### M1. The place summary misstates the warning picture (place view, every town with more than one spell)

- **What is wrong.** The summary sentence takes only the highest level in force now and gives the latest end among those spells. It leaves out a higher level that starts later, and it merges types with different ends into one "until".
- **Evidence** (live ipma-warnings/latest.json, read_at 2026-11-18T16:32:26Z, the page and the file read at 16:48 UTC):
  - Aveiro (`/place/?id=1010500`): summary "Yellow warning for rough sea until 18:00 today (Portugal time)." The file has AVR orange rough sea from 2026-11-18T18:00 to 2026-11-20T00:00. A reader of the summary would think the warning ends at 18:00 today; the block below shows "Today: Orange".
  - Lisboa (`/place/?id=1110600`): summary "Yellow warning for rough sea and rain until Thu 19 Nov 06:00". Rain ends 2026-11-18T18:00; only rough sea runs to 06:00; LSB orange rough sea follows from 2026-11-19T06:00 to 12:00 and is not mentioned.
- **Fix.** In the warnings clause (place.js, about line 197): give each type its own end, and add the highest upcoming level when it is higher than the one in force, for example "Yellow warning for rough sea until 18:00 today, then orange until Fri 20 Nov 00:00 (Portugal time)", or end the clause with "Orange later: see below." Never give one "until" for types that end at different times.

### M2. The place summary shows figures from stale and old files as current (place view; N15)

- **What is wrong.** Each block marks its own file as stale or old, and the band says "Not current", but the summary sentence repeats the figures of a stale or old file with no qualifier.
- **Evidence.** Faro (`/place/?id=1080500`) with ipma-city-forecasts and ipma-fire-risk rewritten through `page.route` to read_at 30 h old (and their dates moved back a day, as a real old file would be): summary "Today 12.4 to 20.7 °C, rain 6%. ... Fire risk class 1 (low)." with no age, while the forecast block says "read 17 Nov, 10:58 UTC, 30 h ago · old: these figures may no longer hold". Screenshot: `shots/place-faro-failure-dark-1366.jpg`. The same with two-day-old forecast, UV and fire-risk files: "Today 10.1 to 18.7 °C, rain 0%. UV 2.9 (low). Fire risk class 1 (low)." The summary is also what a visitor is most likely to quote when they press "Copy link".
- **Fix.** In `finish()`, for a source whose `sourceState()` is stale or old, either leave its clause out and say "Forecast file 30 h old: see below", or append the age to the clause ("(file read 30 h ago, old)"). Same rule for warnings when the warnings file is old.

### M3. The round record gives times after the commits that contain them (behind the scenes)

- **What is wrong.** The brief asks the site to capture the whole sequence, and CLAUDE.md asks for Dinis's words and every number with its time and source. Several times in the round record, published at `/behind-the-scenes/rounds/1/` and its sub-pages, are later than the commit that holds them, so they cannot be true.
- **Evidence** (git log, committer times UTC; my clock read 16:48 UTC when the build was checked):
  - `team/rounds/1.md`: "Aim (conductor, 2026-11-18, about 16:40 UTC)" but commit b37e7e8 is 16:21:41; "Conductor's decisions on the proposal (about 17:45 UTC)" but commit 238551d is 16:34:15, and 17:45 had not happened when I read it.
  - `team/rounds/1/design/PROPOSAL.md` line 5: storm files read "at about 17:30 UTC", commit a86d12c 16:34:02.
  - `team/rounds/1/build/NOTES-B.md`: checks "at about 16:50 UTC", commit 7b46927 16:45:32.
  - `team/rounds/1/copy/NOTES.md` line 3: "about 16:20 to 16:45 UTC", commit 31be435 16:33:03.
- **Fix.** The conductor corrects each time to one that the file's commit allows (from git log or the session's own clock), or writes "time not recorded". A note in the round report that these were corrected keeps the record honest.

## Should fix (may wait for a later round)

- **S1. UV band label contradicts the value** (place view, UV block). Values from 2.0 to 2.99 show "Low (WHO band 0 to 2)", for example Vila do Porto (Ponta Delgada's value) "2.9 Low (WHO band 0 to 2)". The bands in `codes.js` follow IPMA's lower bounds for decimals (Moderado from 3), and WHO rounds to whole numbers (2.9 would be 3, Moderate). Label it "IPMA's band: below 3" or drop the WHO range from the label.
- **S2. Storm page keeps a copied table when the live read fails** (`/storm-charles/`). The "What is in it" table (seven groups with dataset, file and byte counts, "read 18 November 2026 at 16:22 UTC") is static HTML, and it still shows when storm-charles-archive/latest.json is blocked, next to "Could not read ... Nothing is shown in its place". The counts match the live file (weather 12 files, 796,181 bytes; flights 91, 3,557,635; 142 files in all), and the archive is fixed, so this is not a data honesty failure, but it breaks the "read live" rule in spirit. Draw the table from the live file, or keep it and say it is a copy of the 16:22 read.
- **S3. Use the data's Faro point differs from the place table.** The examples use Faro at 37.0194, -7.9304 and print Faro (Aeródromo) 3.7 km; the place card uses places.js's 37.0146, -7.9331 and shows 3.5 km. Use the place table's (IPMA's forecast file's) coordinates so the two agree, or say where the example's point comes from.
- **S4. Home sea headline names one coast in a tie.** "highest total sea today up to 5 m (Figueira da Foz, Costa)": Porto and Viana do Castelo are also at 5 m in the file read at 16:32:14Z. Name all, or "3 coasts".
- **S5. How it was made gives a test command that fails.** "Tests (node --test tests/)" fails on Node 22 ("Cannot find module .../tests"); release.sh and CI run `node --test tests/*.test.mjs`, which passes (25 tests). Print the working command.
- **S6. REALITY.md** still says only that the site was seeded; it lists none of round 1's pages. CLAUDE.md asks for it to be kept true; the conductor updates it at release.
- **S7. Home MeteoAlarm row.** It shows a MeteoAlarm figure (32 of 58 messages not expired) and links "MeteoAlarm's disclaimer, on the warnings page". MeteoAlarm's terms ask re-users to publish the disclaimer; printing its one sentence on the home row as well would remove any doubt.
- **S8. Phone length.** At 390 px `/forecasts/` is about 12,600 px and `/observations/` about 15,300 px tall; the wide charts on forecasts, sea and UV scroll sideways inside their own container (no page overflow). Folding is already listed for round 2.
- **S9. Signatures.** `git log --format=%G?` gives N for every round 1 commit here because `gpg.ssh.allowedSignersFile` is not configured in this checkout, so I could not verify them. The conductor should verify before release (a release needs a signed commit).

## What I checked, and how

### Gates (run locally, nothing changed)

`node scripts/build.mjs` (26 pages, 11 commits on behind the scenes), `node scripts/validate.mjs` OK, `node scripts/leak-scan.mjs` OK (178 files), `node --test tests/*.test.mjs` 25 pass 0 fail, `check-commits.mjs origin/dev HEAD` OK (7), `role-scope.mjs origin/dev HEAD` OK (7), `abp-check.mjs` OK (6 policies). Every round 1 commit has its `Agent:` trailer. `board/HOLD.md` absent.

### Pages

`_site/` served with `python3 -m http.server` on 127.0.0.1, driven with headless Chromium (Playwright). 21 addresses (home, /place/ and five towns, the six source pages, /storm-charles/, /use-the-data/, /how-it-was-made/, /use-with-ai/, /behind-the-scenes/ with commits, round 1, the reviewer's team page and the design proposal) at 390 and 1366 px, light and dark (84 loads): no horizontal page overflow, no console error and no page error, no block left loading, no failure message, explicit body background in both schemes. All 13 pages and /behind-the-scenes/ answer 200 with an index.md twin; /llms.txt answers 200.

| Check | Result |
|---|---|
| Disclaimer "Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC." word for word | In the rendered text of every page loaded, in every built index.html and index.md, and in llms.txt. Every page also says "This site is not IPMA's and is not official." |
| Nothing presented as IPMA's or official | No logo images; "official" appears only in "not official", the policies, and a quoted archive note on the storm page. |
| IPMA named beside every IPMA figure, with publisher, time read and terms | Each place block and home row ends with "IPMA (source id), via data.promptugal.news · read <time UTC>, <age> · terms: as below · card · latest.json"; Terms from each card (D6). Source pages carry the provenance box (source, publisher, read time, terms, card). |
| MeteoAlarm with its own terms | Warnings page: national service named (IPMA), link to www.meteoalarm.org, time of issue per message, MeteoAlarm's disclaimer word for word as latest.json gives it, card terms (read by the data site on 2026-11-11, said on the page). See S7 for home. |
| No person named except Dinis Cruz | Capitalised name pairs in src/ and team/rounds/1/: only Dinis Cruz (as the person who instructs) and place, storm and organisation names. |
| No em dashes, no hype words, British English | No U+2014 or U+2013 in _site/ (html, md, txt, js, json, css); validator hype list clean; a wider search (powerful, leverage and others) finds them only inside Dinis's quoted words. |
| No data copied into the repository | Largest JSON in git is tests/fixtures/places-algarve.json, 2,424 bytes; seven fixtures in all, each under 2.5 KB. Only fetch() in src/ goes to data.promptugal.news (data.js `getJSON`) plus the printed example in the place card. See S2 for the storm table. |
| Link previews | Every built page has og:image and twitter:card; 13 cards, all 1200 x 630 PNG, 92 to 135 KB. Cards checked by eye (home, warnings): no figures, disclaimer on the card. |

### Figures against the live files

Live latest.json files fetched with curl at 16:48 UTC: ipma-warnings read_at 16:32:26Z, ipma-city-forecasts 16:30:33Z, ipma-observations 16:32:08Z (hour_utc 15:00Z), ipma-fire-risk 16:32:01Z, ipma-sea 16:32:14Z, ipma-uv 16:32:23Z, meteoalarm-pt 16:32:28Z, storm-charles-archive 2026-11-17T19:27:57Z. The pages showed the same read times, and ages of 16 to 18 minutes at 16:48, which match. Values compared and found equal: Bragança forecast (9.8 to 16 °C, 100%), station Bragança 14.3 °C 63% 1007 hPa, UV 1.5 to 1.2 over five days, fire DICO 0402 class 1; Aveiro spells (three, times as in the file), UV two values a day; Lisboa sea (total 2 to 4 m, swell 1.7 to 4 m NW 5.2 to 8 s, 17.5 to 17.6 °C), Lisboa, Relógio silent and Lisboa, Carnide (CML) 19.3 °C; Vila do Porto: Santa Maria (Aeródromo) silent, Santa Maria / Maia (DROTRH) 17.8 °C with wind, rain and pressure "no value" (null in the file); home: 13 areas, 168 of 227 stations, warmest Madeira, São Vicente 25.2 °C, UV 3.6 Porto Santo, 32 of 58 MeteoAlarm messages; storm group counts as in S2.

### Place view joins (N16)

| Town | Kind | Warning area | Station | Sea | UV | Fire risk |
|---|---|---|---|---|---|---|
| Bragança 1040200 | inland | BGC, none | Bragança, 1.5 km | none within 25 km, nearest Viana do Castelo 172 km, labelled this site's choice | own id | DICO 0402 |
| Aveiro 1010500 | coast | AVR, three spells | Aveiro (Universidade), 0.8 km | none within 25 km, Figueira da Foz 58.7 km | own id, two values shown | DICO 0105 |
| Vila do Porto 3410100 | island | AOR, none | nearest silent (2.7 km), nearest reporting 11.1 km, both named | none within 25 km, Ponta Delgada 120 km, no values | "IPMA gives no UV for Vila do Porto. Shown: Ponta Delgada, 99 km away." | islands sentence (D5) |
| Lisboa 1110600 | coast | LSB, four spells | silent 0.5 km, Carnide 5 km | Lisboa, costa 20.4 km "within 25 km, this site's choice" | own id | DICO 1106; Storm Charles link, dated, "not current weather" |

Also Funchal (sea 11.3 km), Loulé and Portimão (UV from Faro at 15.9 and 54.2 km), Sagres (fire point 7.8 km from the town, said on the card). All match the analyst's notes and places.js. The joins are right; only the summary line (M1, M2) is wrong.

### Staleness and failure states (N15)

With `page.route` on the place view (Faro): observations aborted, UV HTTP 500, sea 5 h, fire 30 h. Each block failed or aged on its own, with its own words and the file link; the band listed all four; nothing guessed. Two-day-old files with dates moved back: past days dropped and counted ("2 days before today are not shown"), every block marked old. Sea held 6.5 s: band "Still reading 1 of 6 files", block "Still reading the sea file", then cleared. Source pages, each with its file aborted, 5 h and 30 h old: warnings, MeteoAlarm, forecasts, observations, fire risk, sea, UV all show the failure message or the stale and old banner with the age and read time; home shows the band and per-row state for UV and warnings; the storm page shows its failure message and never an age (an archive). No page errors in any of these runs; the only console errors are the blocked requests themselves.

### "Use the data" examples (N17)

Extracted the 16 code blocks from the built `_site/use-the-data/index.html` and ran them unchanged: curl block 7 (nearest station to a point, jq) printed Faro (Aeródromo), 3.7 km, hour 15:00Z, exit 0; curl 13 (age check) "read 2026-11-18T16:32:26Z, 0.3 hours ago"; curl 11 (reads.json) five runs; JavaScript 8 (nearest station, fetch, Node 22) and 6 (Faro forecast, fetch) printed the same values as the live file. See S3.

### Keyboard and contrast

First Tab gives the visible "Skip to the content" link to `#main` (present). Focus outline 3 px solid on every stop (light #0b5c7a, dark #5fb3d3). At 1366 px the town filter is the first stop in main (16th Tab); typing "bra" gives "4 of 35 towns", Down arrow moves to Braga, Enter opens it without a reload and moves focus to its h1. At 390 px the picker is an open `<details>` reached by Tab, with the filter next. Contrast of state words, band, status and muted text on home and the place view with stale, old and failed files: lowest 5.09:1 light, 6.61:1 dark; UV and warning tiles 9.8:1 and above.

### Behind the scenes

Team (six roles, each with ROLE and POLICY rendered), Dinis's words with the time, the flow, every commit from git log with its Agent: role (11 commits, 0 without a trailer), the round 1 report and all of its notes rendered. See M3 for the times in that record.

### Screenshots

`shots/` (scripts/shots.mjs --max-height=2000, quality 70, plus one failure shot taken the same way): home, Aveiro and Vila do Porto at 390 and 1366 px, and Faro with failed and old files in dark at 1366 px. About 1.2 MB in all.
