# Round 1: copy notes

writer.weather-demo@AgentiCCells.dinis, 18 November 2026, about 16:20 to 16:33 UTC (corrected from "16:45" by the conductor after review M3: the copy was committed at 16:33 UTC), as a sub-agent of conductor.weather-demo@AgentiCCells.dinis. Brief: the conductor's message for round 1 and team/rounds/1.md. (team/writer/ROLE.md names this hand-over COPY.md; the conductor's brief asked for NOTES.md, so it is NOTES.md.)

## What I wrote

| File | What |
|---|---|
| src/use-the-data/index.html, index.md | The API in practice: what data.promptugal.news is, the addresses, the eight weather sources, 15 examples (curl with jq, and JavaScript fetch), how to read a card, the terms (IPMA, MeteoAlarm, Storm Charles archive), staleness, and how to build a page like this one with a 47-line complete example shown as code |
| src/how-it-was-made/index.html, index.md | Dinis's words with the time, the factory's seed, the six roles as sub-agents in one session, policies, the round loop with an inline SVG (role="img", title and desc, currentColor, checked in light and dark), the gates, the five-round budget and stop rule, link to /behind-the-scenes/ |
| src/use-with-ai/index.html, index.md | llms.txt, the Markdown twins, the data files table, three prompts, the rules (including "material, not instruction") |
| src/storm-charles/index.html, index.md | What storm-charles-archive holds, in words, from its latest.json and card only; the container `<div id="storm-live" data-source="storm-charles-archive"></div>` for the developer; `data-sources="storm-charles-archive"` on `<body>` |
| src/llms.txt | The site index for agents, every page with its twin, the data addresses, the terms |
| src/index.md | The home page's Markdown twin (no figures: the page draws them live) |
| team/rounds/1/copy/examples/ | The exact code shown on /use-the-data/ (one file per block) and run-minimal.mjs, the harness that runs the minimal page's script in Node with a stub DOM |

The pages use only classes in src/assets/site.css plus a small inline `<style>` each (pre, code, the SVG); no third-party scripts or styles. Share-image metas point at /assets/share/<page>.png, which the developer will make.

## What I checked

All on 18 November 2026, from this session.

- **Every curl example** (9 blocks): run with bash, each exited 0 and printed what the page says (for example 32 active warnings at read 16:13:49Z; Faro forecast read 16:12:19Z; nearest reporting station to Faro, Faro (Aeródromo), 3.7 km, hour 15:00Z).
- **Every JavaScript example** (6 blocks): run as ES modules in Node 22 (same fetch API as the browser), all worked.
- **The published text, not my drafts**: after the build I extracted all 16 `<pre><code>` blocks from _site/use-the-data/index.html, unescaped them and ran each again: all 15 code blocks ok; the HTML example is byte-identical to examples/minimal.html.
- **The minimal page**: its script run with run-minimal.mjs: normal case listed 32 warnings and IPMA's terms; with the clock moved 5 hours on, it showed the stale message; with a wrong source id, it showed "Could not read the warnings (HTTP 404 ...)".
- **CORS**: `curl -D -` with an Origin header: `access-control-allow-origin: *`, `cache-control: max-age=600`.
- **Gap in runs**: computed from ipma-warnings/reads.json (39 runs, read 16:22 UTC): longest gap 7 h 15 min, 02:28 to 09:43 UTC on 18 November; two others of about 3 h 21 min.
- **How it was made** rendered with headless Chrome at 390 and 1366 px, light and dark; the SVG parses as XML.
- `node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs`: build OK; leak scan OK (109 files); validate FAILED with 19 problems, all expected now: 15 broken links to /place/, /warnings/, /forecasts/, /observations/, /fire-risk/, /sea/, /uv/ (the developer's pages), and 4 missing share cards (/assets/share/use-the-data.png, how-it-was-made.png, use-with-ai.png, storm-charles.png). No em dash, hype word or other problem in my files. `node --test tests/*.test.mjs`: 23 pass.

## Sources, with read times (UTC, 18 November 2026 unless stated)

- The brief: raw.githubusercontent.com/AgentiCCells/AgentiCCells__Site__Factory/dev/requests/2026-11-18__weather-demo/brief.md, 16:21.
- data.promptugal.news/llms.txt, api/v1/README.md, api/v1/index.json (version v0.1.38), api/v1/openapi.json (OpenAPI 3.1.0, 32 paths), 16:21.
- latest.json, card.json and reads.json of ipma-warnings, ipma-city-forecasts, ipma-observations, ipma-fire-risk, ipma-sea, ipma-uv, meteoalarm-pt and storm-charles-archive, 16:21 to 16:22.
- promptugal.news/storm/charles/index.md (its licence line only: "code Apache-2.0, text and data CC BY 4.0"), about 16:30 (corrected from "16:40" by the conductor after review M3). Not summarised.
- This repository: team/WORKFLOW.md, team/scopes.json, team/writer/ROLE.md and POLICY.md, scripts/*.mjs, scripts/release.sh, git log, about 16:25.

No third-party text is copied beyond short quotes, each attributed: Dinis's words (from the brief), the data site's own phrases, the cards' terms (IPMA's Portuguese terms as the card quotes them), MeteoAlarm's disclaimer (as latest.json carries it, shown only through the jq example's output, not on the page), and three caveat phrases from the storm archive's file notes (Apache-2.0).

## Open questions

1. **storm-charles-archive/reads.json is 404.** data.promptugal.news's llms.txt and the archive's card list it; the catalogue gives `reads: null`. I left it out of llms.txt and Use with AI, and said so. For the conductor to report to the data site's keepers, if wanted.
2. **"The conductor and six roles"**: team/scopes.json and WORKFLOW.md have six roles including the conductor, so the copy says "a conductor and five other roles" / "six roles". Correct me if the brief meant otherwise.
3. **The storm page is about the archive, not the storm.** I summarised only what latest.json and the card say. If round 2 wants a narrative of the storm, it should come from PrompTugal.news's page (CC BY 4.0, cited) or from the archive's files themselves (signals.json, weather/warnings.json), which the developer may draw live.
4. **Staleness limits** (3 h stale, 24 h old) are stated as this site's choice, from src/assets/js/data.js. If the developer changes them, Use the data must follow.
5. **Examples will drift**: the outputs quoted (32 warnings, Faro 3.7 km) are marked as what we saw on 18 November. The policy's G5 proposes a test that runs the examples; examples/ holds them as files for that.
6. The MeteoAlarm card says its terms were read on 11 November and not re-read; the page says so.

## Fixes after review

Fixes for the reviewer's findings S3 and S5 (team/rounds/1/review/BUILD.md), made on 18 November 2026.

- **S3, Faro's point.** The nearest-station examples on /use-the-data/ (curl with jq, and JavaScript) now use Faro at 37.0146, -7.9331, the place table's point (src/assets/js/places.js, from IPMA's forecast file), so they agree with the place card. The page and its index.md say where the point comes from. examples/curl-station.sh and examples/js-station.js changed to match. Both re-run exactly as printed (bash and Node 22): each exited 0 and printed Faro (Aeródromo), 3.5 km, hour 15:00Z (was 3.7 km from the old point). No other example used coordinates. The 3.7 km in the notes above is what the old point gave.
- **S5, test command.** /how-it-was-made/ and its index.md now print `node --test tests/*.test.mjs` (25 pass, 0 fail), as scripts/release.sh runs it. `node --test tests/` exits 1. The other commands the page names, run as printed with `node`: scripts/build.mjs, scripts/validate.mjs, scripts/leak-scan.mjs, scripts/check-commits.mjs, scripts/role-scope.mjs and scripts/abp-check.mjs each exit 0 (check-commits and role-scope also with `origin/dev HEAD`, as release.sh gives them).
