# Round 2 re-check after the fixes

By reviewer.weather-demo@AgentiCCells.dinis, 2026-11-18, 18:04 to 18:14 UTC (`date -u`), as a sub-agent of conductor.weather-demo@AgentiCCells.dinis. Text CC BY 4.0. Checked: the local checkout at 94caa53 (02fff90, the proposal's citation, and 94caa53, the developer's fixes, since my review at be4cb99), built with `node scripts/build.mjs`, `_site/` served on localhost, headless Chromium through `require('playwright')`. Live files: the seven latest.json and card.json files read from data.promptugal.news at 18:05 UTC (the collector's read times 17:54:27 to 17:56:22 UTC), served to every page from that one copy through `page.route`; for the stale runs the sea file's `read_at` was set 5 h back and UV's 30 h back (simulation, for the test only). No warnings were added: the live file has yellow and orange spells for Lisboa and Aveiro.

## Verdict: DO NOT RELEASE

Every item from my review and the designer's review is fixed, and nothing the fixes touched has regressed. One thing remains, found by a stricter check than in my first review (opening each fold on its own at 390 px, not only the page as loaded):

- **R1 (must fix). Opening a fold at 390 px makes the whole page scroll sideways.** Workbench: "Show the two snippets" adds 629 to 906 px of sideways scroll, "The whole record" 313 to 382 px (8 of 8 folds of these kinds on Lisboa). `/place/`: "How this card was put together" adds 344 px (Lisboa 1110600 and Bragança 1040200). Cause: below the wide breakpoint `.wb-layout` and `.place-layout` are one-column grids with an `auto` column, so the column grows to the `pre` snippet or the matching table's width instead of letting the `pre` scroll in its box. Not caused by the fixes: the same numbers in the build at c81f1e8 (Workbench, new this round) and at 521db99 (`/place/`, already live since round 1; I missed it in round 1 and in my first round 2 review because I measured with folds closed). Fix, checked in the browser by injecting the rule (all four cases then 0 px): `.wb-main,.card-col{min-width:0}`, or `grid-template-columns:minmax(0,1fr)` on both layouts below the breakpoint. Owners: the developer (`src/d/workbench/workbench.css`, `src/assets/site.css`).

Once R1 is fixed and the fold check below is re-run with 0 px, this build can pass.

## Per item

| Item | What I saw | Result |
|---|---|---|
| M1, `/observations/` silent-stations fold | 390 and 1366: summary "82 stations sent nothing for 17:00 UTC"; 7 town links in the fold, each with its name (for example "Braga (CIM) (nearest to Braga)", link `/place/?id=1030300`; also Santa Cruz da Graciosa, Leiria, Ponta Delgada); no "http" and no ",," in the text | fixed |
| M2, Postcard front source lines | Lisboa at 390 and 1366, Aveiro at 1366: each of the four facts (Station, Sea, UV, Fire risk) has a visible provLine on the front, for example "IPMA (ipma-sea), via data.promptugal.news · read 18 Nov, 17:56 UTC, 10 min ago · terms: as below · card · latest.json". Stale run: Sea's line adds "5 h ago · stale: the collector may have missed runs", UV's "30 h ago · old: these figures may no longer hold". Lowest contrast of the new lines: 6.09 light, 7.05 dark | fixed |
| M3, a person named | a case-blind grep for the three authors' surnames (pattern not repeated here, so this file does not publish them) over `team/`, `src/` and `_site/`: no match after one more change. The proposal (02fff90) now cites "the 2009 colour-vision simulation matrices published in IEEE Transactions on Visualization and Computer Graphics 15(6)". My own BUILD.md still quoted the three surnames in its M3 item, and the build published it at `_site/behind-the-scenes/rounds/2/review/BUILD/`; I replaced the quote with a description (in my scope, not committed). The conductor needs to commit it with this file and rebuild | fixed, with the BUILD.md change |
| Designer M1, warnings strip at 390 | text right edge against each cell's content edge, light and dark: Postcard and `/place/` for Lisboa (Yellow, Yellow, Orange, Yellow) and Aveiro (Orange, Orange, Orange, Yellow): 6.6 to 11.6 px inside every cell (was 9 to 15 px past). Two towns: 17.3 to 27.2 px inside | fixed |
| Designer M2 / S2, Timetable "now" | 1366, light, dark and stale: the tick is 7.2 px tall in the top padding of each of the 7 Today cells; 13 text boxes in those cells, 0 cross it. Caption: "The solid tick at the top of Today marks now; a dotted tick marks when each file was read." | fixed |
| S1, Timetable state word on a phone | 390 with the stale files, light and dark: "Sea (stale): total sea 2 to 4 m", "UV index (old): 0.8 Low", on every day's item. Word contrast 6.56 light, 7.13 dark | fixed |
| S3, Timetable read times | every row label "read 17:56 UTC, 14 min ago" (and so on), as the provLine. "Portugal time" remains only for the "now" label and the axis note ("Times: Portugal time, as IPMA gives them"), which is right | fixed |
| S4, `/observations/` column button | no `aria-pressed` before or after; label "Show all 9 columns", then "Show 4 columns" | fixed |
| S6, `/forecasts/` summary | text read out at 390: "Bragança · today 9.8 to 16° · rain 100% · area Bragança"; the " · " is visually hidden | fixed |
| S5, Two towns length | not in the developer's brief; still open, polish | open (not blocking) |

## No regression

| Check | Result |
|---|---|
| `node scripts/build.mjs` | chooser written (6 designs), layout applied to 42 pages, built `_site/` |
| `node scripts/validate.mjs` | OK |
| `node scripts/leak-scan.mjs` | OK (251 files, 170 binary skipped) |
| `node --test tests/*.test.mjs` | 33 of 33 pass |
| `role-scope.mjs be4cb99 HEAD`, `check-commits.mjs be4cb99 HEAD` | OK (2 commits); no change to `scripts/` or `.github/` in the range. `board/HOLD.md` absent |
| Every page as loaded (all 42 built pages, designs and `/place/` on Lisboa), 390 and 1366, light and dark: 168 runs | no console error, no page error, no sideways scroll; no "undefined", "NaN", "[object" or "Invalid Date" in any page's text, except my own BUILD.md page on behind-the-scenes, which quotes those words as the strings it searched for |
| Every fold opened on its own at 390 (273 folds on 42 pages) | 0 px sideways scroll on all but the 9 folds in R1 |
| Personal names in `_site/` | capitalised name pairs and e-mail addresses over every HTML, Markdown, JSON, JS and text file: the only person is Dinis Cruz, as the person who instructs (`/how-it-was-made/`, the policies and briefs on behind-the-scenes). "Storm Charles" is the storm's name; the rest are places, organisations and products |

Not checked here: Firefox, Safari, a screen reader; keyboard paths beyond those in my first review (the fixes added no control).
