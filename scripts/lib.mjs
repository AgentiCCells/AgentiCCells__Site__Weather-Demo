// Shared layout for every page: the <head> extras (link previews, styles, icon), the header
// with the navigation and the disclaimer, and the footer. scripts/layout.mjs applies it to
// every built page at build time: a page in src/ writes <!--HEAD-->, <!--HEADER--> and
// <!--FOOTER--> where these go. Node built-ins only. Code Apache-2.0; text CC BY 4.0.
// Written by conductor.ipma-data@AgentiCCells.dinis, 2026-11-18, round 1, for AgentiCCells__Site__Weather-Demo;
// copied here (Apache-2.0, same organisation) by conductor.weather-demo@AgentiCCells.dinis on 2026-11-18 and
// changed for this site: address, name, navigation.
import { readFileSync, existsSync } from 'node:fs';
export const SITE = 'https://weather-demo.agenticcells.site';
export const REPO = 'https://github.com/AgentiCCells/AgentiCCells__Site__Weather-Demo';
export const SITE_NAME = 'Weather, from our data';
// The brief's rule, on every page, word for word.
export const DISCLAIMER = 'Not a warning service. For warnings and safety, follow IPMA (ipma.pt) and ANEPC.';
export const NAV = [
  ['/', 'Now'],
  ['/place/', 'Your town'],
  ['/warnings/', 'Warnings'],
  ['/forecasts/', 'Forecasts'],
  ['/observations/', 'Stations'],
  ['/fire-risk/', 'Fire risk'],
  ['/sea/', 'Sea'],
  ['/uv/', 'UV'],
  ['/storm-charles/', 'Storm Charles'],
  ['/use-the-data/', 'Use the data'],
  ['/how-it-was-made/', 'How it was made'],
  ['/behind-the-scenes/', 'Behind the scenes'],
  ['/use-with-ai/', 'Use with AI'],
];
// The six designs (src/designs.json), for the designs control in the header.
// developer.ipma-data@AgentiCCells.dinis (instance D), round 2.
export const DESIGNS = JSON.parse(readFileSync(new URL('../src/designs.json', import.meta.url), 'utf8')).designs;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// path: the page's URL path, e.g. /warnings/. title, description: from the page itself.
// image: the share card's path under /assets/share/ (a 1200x630 PNG), or the default.
export function head({ path, title, description, image }) {
  const url = SITE + path;
  const img = SITE + (image || '/assets/share/home.png');
  return [
    `<link rel="canonical" href="${esc(url)}">`,
    `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">`,
    `<link rel="stylesheet" href="/assets/site.css">`,
    `<link rel="alternate" type="text/markdown" href="${esc(path.endsWith('/') ? path + 'index.md' : path.replace(/\.html$/, '.md'))}" title="This page as Markdown">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`,
  ].join('\n');
}

export function header(path) {
  const here = p => (p === '/' ? path === '/' : path.startsWith(p));
  // conductor.weather-demo@: only pages that exist (in src/, or generated: behind the scenes) are linked.
  const exists = p => p === '/' || p === '/behind-the-scenes/' || existsSync(new URL(`../src${p}index.html`, import.meta.url));
  const links = NAV.filter(([p]) => exists(p)).map(([p, t]) => `<a href="${p}"${here(p) ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('');
  return `<a class="skip" href="#main">Skip to the content</a>
<header class="site-head">
<div class="bar"><a class="brand" href="/">${esc(SITE_NAME)}</a><nav class="nav" aria-label="Site">${links}</nav>${designsControl(path)}</div>
<p class="disclaimer" role="note"><strong>${esc(DISCLAIMER)}</strong> This site is not IPMA's and is not official.</p>
</header>`;
}

// The designs control (round 2, developer instance D of the weather demo: the summary names the design
// in full, "Designs: The main design"): a <details> list of the six designs, the current one marked. It opens
// and closes without JavaScript; /assets/js/designs-menu.js adds Escape and click-outside to
// close it. The last item links to the chooser at /d/, so the control is never a dead end.
export function designsControl(path) {
  if (DESIGNS.length < 2) return ''; // conductor.weather-demo@: no control until the other designs exist
  const cur = (DESIGNS.find(d => d.path !== '/' && path.startsWith(d.path)) || (path === '/d/' ? null : DESIGNS[0]));
  const items = DESIGNS.map(d => {
    const on = cur && d.slug === cur.slug;
    return `<li><a href="${esc(d.path)}"${on ? ' aria-current="true"' : ''}><strong>${esc(d.name)}</strong>${on ? ' <span class="dm-on">(this design)</span>' : ''}<span>${esc(d.line)}</span></a></li>`;
  }).join('');
  return `<details class="designs-menu"><summary>Designs${cur ? `<span class="dm-now">: ${esc(cur.name)}</span>` : ''}</summary>
<div class="dm-panel"><p class="dm-head">${DESIGNS.length} designs, the same live data</p><ul>${items}</ul><p class="dm-all"><a href="/d/">Compare all ${DESIGNS.length} designs</a></p></div></details><script type="module" src="/assets/js/designs-menu.js"></script>`;
}

export function footer(path) {
  return `<footer class="site-foot">
<p class="disclaimer"><strong>${esc(DISCLAIMER)}</strong></p>
<p>Weather data: <a href="https://www.ipma.pt/">IPMA, Instituto Português do Mar e da Atmosfera</a>, read live in your browser from <a href="https://data.promptugal.news">data.promptugal.news</a>. IPMA's terms: free to copy and use for personal or public use if the use has no profit-making or offensive purpose; always name IPMA as the source. This site has no ads, no payments and no profit-making purpose.</p>
<p>Version <a href="/version.json">__VERSION__</a> · Made by the AgentiCCells agents (<a href="/behind-the-scenes/">behind the scenes</a>) · <a href="${REPO}">Source</a> · <a href="${esc(path.endsWith('/') ? path + 'index.md' : path)}">This page as Markdown</a> · Code Apache-2.0, text CC BY 4.0; data under each source's own terms.</p>
</footer>`;
}
