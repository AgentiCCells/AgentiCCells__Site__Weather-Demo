// designs.mjs: write the chooser at /d/ (_site/d/index.html) from src/designs.json and the layout
// drawings in scripts/cards.mjs (SCHEMATIC), so the chooser, the designs control in the header and
// the share cards cannot disagree. scripts/build.mjs runs it after copying src/ and before
// layout.mjs, which then fills <!--HEAD-->, <!--HEADER--> and <!--FOOTER-->. Node built-ins only.
// Code Apache-2.0; text CC BY 4.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance D), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md section 9 and the conductor's decision D1 (team/rounds/2.md).
// The chooser's markup and style block follow the IPMA-Data cell's chooser
// (AgentiCCells/AgentiCCells__Site__IPMA-Data, src/d/index.html, Apache-2.0, same organisation),
// generated here instead of written by hand.
import { mkdirSync, writeFileSync } from 'node:fs';
import { DESIGNS, esc } from './lib.mjs';
import { SCHEMATIC } from './cards.mjs';

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const n = DESIGNS.length;
const Num = WORD[n] ? WORD[n][0].toUpperCase() + WORD[n].slice(1) : String(n);
const others = DESIGNS.filter(d => d.slug !== 'main');
const list = names => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
// Every card opens on the same town (Lisboa). The main design shows one town in Your town.
const TOWN = 1110600;
const href = d => (d.path === '/' ? `/place/?id=${TOWN}` : `${d.path}?id=${TOWN}`);

const cards = DESIGNS.map(d => {
  const pal = d.palette || [];
  const drawing = SCHEMATIC[d.slug] || `<rect width="160" height="100" fill="${esc(pal[0] || '#ffffff')}"/>`;
  return `<li class="dc">
<a href="${esc(href(d))}" style="--p0:${esc(pal[0] || '#ffffff')};--pi:${esc(pal[2] || '#000000')}">
<svg class="dc-pre" viewBox="0 0 160 100" aria-hidden="true" focusable="false">${drawing}</svg>
<span class="dc-body">
<span class="dc-name">${esc(d.name)}</span>
<span class="dc-line">${esc(d.line)}</span>
<span class="dc-pal" aria-hidden="true">${pal.map(c => `<span style="background:${esc(c)}"></span>`).join('')}</span>
<span class="dc-vh">Palette: ${esc(pal.join(', '))}.</span>
<span class="dc-type" style="font-family:${esc(d.fonts)}"><span class="dc-vh">Type sample: </span>Lisboa · <span style="font-family:${esc(d.figures || d.fonts)}">0123456789 °C</span></span>
</span>
</a>
</li>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Designs | Weather, from our data</title>
<meta name="description" content="${esc(`${Num} designs of the same live weather data: the main design and ${list(others.map(d => d.name))}. Not a warning service.`)}">
<meta name="share-image" content="/assets/share/d.png">
<!--HEAD-->
<style>
/* The chooser (team/rounds/2/design/PROPOSAL.md, section 9). The drawings are layouts, boxes and
   lines with no data, so this page never shows a stale figure. Style block copied from the
   IPMA-Data cell's chooser (AgentiCCells/AgentiCCells__Site__IPMA-Data, src/d/index.html,
   Apache-2.0, same organisation), written there by developer.ipma-data@AgentiCCells.dinis
   (instance D); generated here by scripts/designs.mjs. */
.d-chooser .dcs{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;gap:.8rem;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:820px){.d-chooser .dcs{grid-template-columns:repeat(3,minmax(0,1fr));gap:1.1rem}}
.d-chooser .dc a{display:flex;flex-direction:column;height:100%;text-decoration:none;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.d-chooser .dc a:hover{border-color:var(--map-edge)}
.d-chooser .dc a:hover .dc-name{text-decoration:underline}
.d-chooser .dc-pre{display:block;width:100%;height:auto;aspect-ratio:16/10;border-bottom:1px solid var(--line)}
.d-chooser .dc-body{display:flex;flex-direction:column;gap:.35rem;padding:.6rem .7rem .75rem;flex:1}
.d-chooser .dc-name{font-weight:700;font-size:1.02rem;color:var(--accent)}
.d-chooser .dc-line{font-size:.84rem;color:var(--muted);line-height:1.4}
.d-chooser .dc-pal{display:flex;gap:3px;margin-top:auto;padding-top:.2rem}
.d-chooser .dc-pal span{flex:1;height:.9rem;border:1px solid var(--map-edge);border-radius:2px}
.d-chooser .dc-type{font-size:1.05rem;background:var(--p0);color:var(--pi);padding:.25rem .45rem;border-radius:4px;border:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d-chooser .dc-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:420px){.d-chooser .dc-line{font-size:.8rem}.d-chooser .dc-type{font-size:.92rem}}
</style>
</head>
<body class="d-chooser">
<!--HEADER-->
<main id="main">
<h1>Designs</h1>
<p class="lede">${esc(`${Num} designs of the same data: the main design, which is the whole site, and ${WORD[others.length] || others.length} others, each showing one town in its own way. Every design reads the same live files from data.promptugal.news with the same rules.`)}</p>
<ul class="dcs">
${cards}
</ul>
<p class="note">The drawings are layouts, not data. In every design: the disclaimer, the source and read time beside every block, a plain message when a file is missing, stale or slow, and warning levels as words beside hatched swatches, so a red warning looks red everywhere. The list is also at <a href="/designs.json">designs.json</a>.</p>
</main>
<!--FOOTER-->
</body>
</html>
`;
mkdirSync('_site/d', { recursive: true });
writeFileSync('_site/d/index.html', html);
console.log(`chooser written: _site/d/index.html (${n} designs)`);
