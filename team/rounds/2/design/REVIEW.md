# Round 2 design review: the built designs against the proposal

By designer.weather-demo@AgentiCCells.dinis, 2026-11-18, round 2, about 17:40 to 18:00 UTC, as a sub-agent of conductor.weather-demo@AgentiCCells.dinis. Text CC BY 4.0. Checks the build of instances C and D (commits 3d764f8 and c81f1e8; `team/rounds/2/build/NOTES-C.md`, `NOTES-D.md`) against my proposal (`team/rounds/2/design/PROPOSAL.md`) and the conductor's decisions D1 to D6 (`team/rounds/2.md`).

**How.** `node scripts/build.mjs` (chooser written, 6 designs; layout applied to 40 pages), `_site/` served on localhost, headless Chromium (Playwright) at 390 and 1366 px, `colorScheme` light and dark. The data files were saved from data.promptugal.news at 17:43 UTC (the collector read them 17:39 to 17:41 UTC) and served to every page from that one copy, so all runs saw the same data. Pages: `/d/`, Postcard (front and `side=back`), Timetable, Two towns (two and three towns), Workbench, Large print (all on Lisboa 1110600 unless named), `/observations/`, `/forecasts/`. For each run: the tokens as computed on `body`, the font stacks as computed, page height, sideways scroll, console errors, and a contrast scan of every visible text element against its painted background (details opened).

**Overall.** Every design leads with what the proposal says, uses the proposal's palette tokens exactly (light and dark, all ten tokens, read from the computed styles) and its type, and has no sideways scroll and no console error at either width or theme. Every rendered text element passes AA (lowest 4.63, the main design's `--fresh` "read n min ago" on its own bg, unchanged from round 1), and Large print passes AAA in every element (lowest 8.37). The five stay distinct from each other at 1366 px; at 390 px three of them share the same top third (polish, below). **Two must-changes**, both small: the warnings strip words run past their cells at 390 px (Postcard, and `/place/` itself), and Timetable's "now" line is drawn over the text of Today's cells.

## Contrast as built (WCAG 2, from computed tokens)

Ink, muted and accent on bg and on panel (surface); button is accent-ink on accent. The values equal the proposal's section 8 (tokens unchanged), so its colour-blind figures stand: I did not re-run the simulation.

| Design, theme | ink/bg | ink/panel | muted/bg | muted/panel | accent/bg | accent/panel | button | lowest status word |
|---|---|---|---|---|---|---|---|---|
| Postcard light | 13.14 | 15.06 | **5.31** | 6.09 | 7.00 | 8.02 | 8.16 | stale/bg 5.63 |
| Postcard dark | 14.77 | 13.38 | 7.84 | **7.10** | 9.64 | 8.73 | 9.64 | old/panel 7.05 |
| Timetable light | 14.57 | 16.52 | 5.96 | 6.76 | **5.68** | 6.44 | 6.44 | stale/bg 5.79 |
| Timetable dark | 15.54 | 13.78 | 8.25 | 7.32 | 8.18 | **7.25** | 8.18 | old/panel 7.13 |
| Two towns light | 16.45 | 17.17 | **6.24** | 6.52 | 7.71 | 8.05 | 8.05 | stale/bg 6.29 |
| Two towns dark | 15.60 | 14.08 | 7.35 | **6.63** | 8.22 | 7.42 | 8.22 | old/panel 7.26 |
| Workbench light | 15.39 | 16.71 | **5.94** | 6.46 | 6.33 | 6.87 | 6.87 | stale/bg 6.04 |
| Workbench dark | 15.29 | 13.94 | 7.86 | **7.17** | 8.93 | 8.15 | 8.93 | old/panel 7.42 |
| Large print light | 21.00 | 18.76 | 10.86 | 9.70 | 9.37 | **8.37** | 9.37 | stale/panel 8.30 |
| Large print dark | 21.00 | 18.42 | 13.62 | 11.94 | 10.05 | **8.82** | 10.05 | old/panel 8.07 |

Rendered-text scan, lowest per page (every element, both widths): Postcard 5.31 light, 7.10 dark; Timetable 5.68, 7.25; Two towns 6.24, 6.63; Workbench 5.94, 7.17; Large print 8.37, 8.82 (target 7); `/d/` 5.38, 6.61; `/observations/` and `/forecasts/` 4.63 light (main design's `--fresh`, round 1, passes), 6.61 dark. No element below its target.

Type as computed: Postcard h1, h2 and message in `Charter, "Iowan Old Style", Georgia, serif` (message 20 px = 1.25 rem), body sans, figures tabular; Timetable and Two towns system sans; Workbench paths, values and snippets in `ui-monospace, SFMono-Regular, Menlo, monospace`, prose sans; Large print `Verdana, "DejaVu Sans", ...` everywhere, body 22 px, h1 52.8 px at 1366, provLines 19.8 px (0.9 em), every button, select and summary in the page at least 48 px tall.

## Postcard

Leads, as proposed, with the town, date line, the message in serif with its accent rule, the dashed stamp ("Now", swatch with hatch, "Yellow", "warning area Lisboa") and the postmark, then warnings and forecast; the facts on the right turn the card over. The back is two by two at 1366, then the storm line, "How this card was put together", the address and the terms. It reads like a card and is the most distinct of the five.

**Must-change**
- M1. **The warnings strip's level words run past their cells at 390 px.** Measured: the text ends 9, 9, 15 and 9 px past the cells' padding edge (Now, Today, Tomorrow, Day after), so "Yellow" and "Orange" touch or cross the cell border (`review-shots/postcard-strip-390.png`). The word carries the level for colour-blind readers, so it must sit inside its cell. The same strip on `/place/` at 390 px measures the same (so it predates round 2; Two towns at 390 is fine, -4 to -10 px). Fix in `postcard.css` (for example `.pcp-card{padding:1rem}` below 520 px, or the swatch above the word in `.pc-strip li` there), and pass the `/place/` case to whoever owns `site.css`.

**Polish**
- P1. The message repeats the town ("Lisboa: Warnings in force...") straight under the h1 "Lisboa". Drop the "<town>: " prefix on the card (Two towns needs it; Postcard does not).
- P2. The message paragraph has `aria-live="polite"` and is rewritten as each file arrives, so a screen reader may announce it up to six times on load. Set it live only after the first full draw, or not at all.
- P3. The postmark's text reads "read17:41 UTC" to assistive technology (the line break is visual only). Add a space.

## Timetable

Leads with time, as proposed: one five-day axis, a row per source in the proposal's order, warnings as hatched level bars per type, range bars on the shared scale, UV tiles with band words, fire classes, the station reading in Today only, the "now" line labelled in the Today header, a read tick per row, and a provLine row under each source. At 390 the day sections and the "Sources and read times" list follow D3. Clear and distinct.

**Must-change**
- M2. **The "now" line is painted over the text in Today's cells.** `.tt-today::after` is positioned (z-index 0, opacity .85) while the cell text is not, so the 2 px accent line crosses whatever text sits at the current minute: at 17:44 it cut "18:00" in "Yellow, rain, 13:15 to 18:00" and "Lisboa," in the station row (`review-shots/timetable-now-line-1366.png`, `timetable-now-line-station-1366.png`). Through the day it will cross warning times and temperatures. Keep the line behind the text: give the cell's content `position:relative; z-index:1` (with the panel colour as a text halo or background), or draw the line only across the bar band and the header, not through text.

**Polish**
- P4. Row labels give the read time as "read 17:41 Portugal time" (the proposal said UTC), while the provLine under the same row says "17:41 UTC". Equal in winter, an hour apart in summer. Portugal time matches the axis, so keep it, but add "(17:41 UTC)" or drop the time from the label and keep the age.
- P5. The forecast and sea rows' empty days say "no value", correct but heavy in italics across two cells; consider "IPMA's file stops at <day>" once across the remaining cells.

## Two towns

Leads with comparison, as proposed: heading row, "In short" per town, then one aligned row per block with one provLine under the row; forecast rows line up day by day across towns; capped at three (D5), Remove disabled at two. At 390, one section per block with the towns under it.

**Must-change:** none.

**Polish**
- P6. Each forecast cell repeats the bars note ("Bars: minimum to maximum temperature...") and each warnings cell repeats the MeteoAlarm note: two to three copies per row. Move both under the row, beside the single provLine (C notes the warnings one needs a `rWarnings` option).
- P7. Long at 390 px (7,283 px for two towns; C measured 8,659 for three). Fold IPMA's Portuguese texts and the per-spell list behind the strip on phones in a later round.
- P8. The light palette (#fafafa, #ffffff, blue accent) is the closest of the five to the main design and to Timetable; it is told apart only by layout. Acceptable; if a later round revisits it, a warmer neutral or a distinct accent would help in the chooser.

## Workbench

Leads with the data, as proposed: the files panel first (id, three file links, read time and age, record count, headline), sticky on the left at 1366; each block a path, value, meaning table with true indexes (`active[18]`, `cities[15]`, `stations[39]`), the join, the two copy buttons, the snippets, the whole record and the provLine. Paths in the teal accent, values in monospace. At 390 the files panel is a closed `<details>` "The six files: 6 read, 0 not fresh" and the tables stack. Distinct.

**Must-change:** none.

**Polish**
- P9. 7,992 px at 390: the warnings table lists four rows per spell (16 rows for Lisboa). On phones, one row per spell (`active[18]`: level, type, start, end on four short lines) would halve it.
- P10. "Copy as fetch" and "Copy as curl and jq" use ink on panel with an accent border, while "Show" is filled accent: fine, but the copy buttons look like inputs at 390. A filled or bolder style for the first would mark the main action.

## Large print

Leads with reading, as proposed: one column of 36 rem, 22 px base, "In short" as one sentence per paragraph, the four warning windows as a table, one sentence per spell, tables for forecast and sea (stacked below 600 px), UV in words, fire risk with tiles beside words, AAA in every element and 48 px controls. Distinct.

**Must-change:** none.

**Polish**
- P11. Paragraph measure at 1366: up to about 64 characters at an average glyph width of 0.6 em (my estimate; Verdana is wide, so the true count is a little lower). The proposal said 60; `main p{max-width:60ch}` would hold it exactly.
- P12. The header navigation wraps to six lines at 390 px at this size (about 290 px before the disclaimer). Proposed as scaling with the page, so not wrong; a later round could fold it on this design.

## The chooser at /d/

As proposed: lede, six cards (drawing, name, line, five light swatches, type sample), the closing note and the link to `designs.json`; two columns at 390, three at 1366; Two towns' line updated for D5.

**Polish**
- P13. At 390 px the type sample is cut with an ellipsis ("Lisboa · 012345..."), so the figures are not seen whole. Allow it to wrap, or shorten to "Lisboa · 0123 °C" below 600 px.
- P14. In dark the swatches still show the light palettes (as the proposal said for this round). A later round can switch to `palette_dark`, already in `designs.json`.

## /observations/ and /forecasts/ (folding, section 11)

Both under the 5,000 px target at 390 px: 4,310 and 4,489 px here (D measured 4,351 and 4,510). The four-column table fits 324 of 324 px with no inner scroll; silent stations are folded and named (D6); forecast cards close below 600 px with the summary text and bar.

**Must-change:** none.

**Polish**
- P15. `/forecasts/` at 390: the summary's range bar is about 70 px wide and "rain 100%" wraps to a second line (`review-shots/forecasts-summary-390.png`). Put the bar on its own line under the text, full width, so it reads against the shared scale.
- P16. `/observations/` at 390: the caption explains "Nearest to" while that column is hidden in the four-column view. Say "(shown with all 9 columns)".
- P17. `/observations/` at 1366 is still 8,718 px (the table shows every reporting station at that width, as proposed). No change asked.

## Distinctness

At 1366 px the five are clearly different: a serif card on warm paper (Postcard), a grid on a cool ground (Timetable), columns of aligned rows (Two towns), a sticky file list with monospace paths (Workbench), and one large column (Large print). At 390 px Timetable, Two towns and Workbench share the same first screen (kicker, h1, picker, status band in system sans on a near-white ground) before their layouts start. Polish (P18): give each design's top a cue of its own on phones (for example Timetable's "now, 17:44" label and today's date up beside the h1; Workbench's file count line before the picker).

## Not checked here

Stale, old and missing states by eye in this review (C and D checked them with blocked files and a moved clock; my contrast table covers the status words). Screen-reader behaviour beyond the aria attributes named. The colour-blind simulation (tokens unchanged from the proposal, which has the figures).

Screenshots in `review-shots/` (4 small PNGs, 60 KB in all), cropped from the runs above.
