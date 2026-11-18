// cards.mjs: render the 1200x630 PNG share cards (link previews) into src/assets/share/:
// one for the home page, one per main page and one per design. A card holds no live figure (it
// would go stale): a title, one line, a simple drawing in the page's or design's style, the
// site name and the full disclaimer. System fonts only; nothing is loaded from another host.
// Run: node scripts/cards.mjs (needs Playwright's Chromium). Each card must stay under 300 KB.
// SCHEMATIC holds the designs' layout drawings (boxes and lines, no data); the chooser at /d/
// uses the same drawings.
// Code Apache-2.0; the cards' text and drawings CC BY 4.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance D), 2026-11-18, round 2, for AgentiCCells__Site__IPMA-Data;
// copied here (Apache-2.0) by conductor.weather-demo@AgentiCCells.dinis on 2026-11-18, address and kicker changed.
// developer.weather-demo@AgentiCCells.dinis (instance B), 2026-11-18, round 1: PAGES and the drawings
// for this site's pages (place, use-the-data, how-it-was-made added; 'd' and 'how-it-works' dropped
// until the designs of round 2 exist), and this site's wording.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { DISCLAIMER, SITE_NAME } from './lib.mjs';
const require = createRequire(import.meta.url);
const OUT = 'src/assets/share';
const { designs } = JSON.parse(readFileSync(new URL('../src/designs.json', import.meta.url), 'utf8'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const R = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

// ---------- the designs' layouts (viewBox 0 0 160 100), as on the chooser ----------
export const SCHEMATIC = {
  main: `<rect width="160" height="100" fill="#f7f5f0"/><rect width="160" height="10" fill="#ffffff"/><rect x="6" y="3.5" width="26" height="3" rx="1.5" fill="#1d2329"/><rect x="40" y="3.5" width="70" height="3" rx="1.5" fill="#5b6670" opacity=".5"/><rect y="10" width="160" height="5" fill="#fff4d6"/><rect x="6" y="20" width="84" height="50" rx="3" fill="#ffffff" stroke="#d9d4ca"/><path d="M38 26l8-2 6 4 2 8-3 7 4 8-5 9-9 2-4-8 1-9-3-8z" fill="#e9e4d8" stroke="#6f7880" stroke-width=".8"/><rect x="96" y="20" width="58" height="50" rx="3" fill="#ffffff" stroke="#d9d4ca"/><rect x="101" y="26" width="30" height="3" rx="1.5" fill="#1d2329"/><rect x="101" y="34" width="46" height="2" rx="1" fill="#5b6670" opacity=".6"/><rect x="101" y="40" width="40" height="2" rx="1" fill="#5b6670" opacity=".6"/><rect x="101" y="46" width="44" height="2" rx="1" fill="#5b6670" opacity=".6"/><rect x="6" y="76" width="148" height="20" rx="3" fill="#ffffff" stroke="#d9d4ca"/><rect x="12" y="81" width="40" height="3" rx="1.5" fill="#0b5c7a"/><rect x="60" y="81" width="34" height="3" rx="1.5" fill="#0b5c7a"/><rect x="102" y="81" width="46" height="3" rx="1.5" fill="#0b5c7a"/><rect x="12" y="88" width="136" height="2" rx="1" fill="#5b6670" opacity=".4"/>`,
  broadsheet: `<rect width="160" height="100" fill="#f4f1ea"/><rect x="8" y="6" width="144" height="2" fill="#8a1c1c"/><rect x="8" y="12" width="120" height="7" fill="#161616"/><rect x="8" y="22" width="90" height="7" fill="#161616"/><rect x="8" y="33" width="144" height=".8" fill="#161616"/><rect x="8" y="38" width="76" height="56" fill="#d8d2c4"/><path d="M40 44l8-2 6 4 2 8-3 7 4 8-5 9-9 2-4-8 1-9-3-8z" fill="#f4f1ea" stroke="#161616" stroke-width=".8"/><rect x="88" y="38" width=".8" height="56" fill="#5a5a5a"/><rect x="120" y="38" width=".8" height="56" fill="#5a5a5a"/>${R(9, i => `<rect x="93" y="${40 + i * 6}" width="23" height="2" fill="#5a5a5a"/><rect x="125" y="${40 + i * 6}" width="27" height="2" fill="#5a5a5a"/>`)}`,
  'chart-room': `<rect width="160" height="100" fill="#f3f0e4"/><path d="M0 70 C40 60 60 85 100 72 S150 60 160 66" fill="none" stroke="#9db4c0" stroke-width=".7"/><path d="M0 80 C40 70 60 95 100 82 S150 70 160 76" fill="none" stroke="#9db4c0" stroke-width=".7"/><path d="M0 90 C40 80 60 105 100 92 S150 80 160 86" fill="none" stroke="#9db4c0" stroke-width=".7"/><rect x="8" y="7" width="60" height="4" rx="1" fill="#13324b"/><rect x="8" y="16" width="88" height="54" fill="#dbe7ec" stroke="#13324b" stroke-width=".6"/>${R(8, i => `<rect x="14" y="${21 + i * 6}" width="22" height="2" fill="#13324b" opacity=".7"/><rect x="${40 + (i * 7) % 18}" y="${21 + i * 6}" width="${18 + (i * 11) % 26}" height="3" rx="1.5" fill="#2f6f9f"/>`)}<rect x="102" y="16" width="50" height="54" fill="#dbe7ec" stroke="#13324b" stroke-width=".6"/><path d="M120 24l7-2 5 4 2 7-3 6 3 7-4 8-8 2-3-7 1-8-3-7z" fill="#f3f0e4" stroke="#13324b" stroke-width=".7"/>`,
  'night-desk': `<rect width="160" height="100" fill="#0d1117"/><rect x="6" y="6" width="50" height="4" rx="1" fill="#e6edf3"/>${R(4, i => `<rect x="${6 + i * 37.5}" y="16" width="34" height="22" rx="3" fill="#161b22" stroke="#30363d"/><circle cx="${13 + i * 37.5}" cy="23" r="2.4" fill="#8b949e"/><rect x="${18 + i * 37.5}" y="22" width="18" height="2" fill="#8b949e"/><rect x="${11 + i * 37.5}" y="30" width="22" height="3" fill="#e6edf3"/>`)}<rect x="6" y="44" width="72" height="50" rx="3" fill="#161b22" stroke="#30363d"/><path d="M36 50l8-2 6 4 2 8-3 7 4 8-5 9-9 2-4-8 1-9-3-8z" fill="#262d33" stroke="#8b96a0" stroke-width=".8"/><rect x="84" y="44" width="70" height="50" rx="3" fill="#161b22" stroke="#30363d"/>${R(6, i => `<rect x="90" y="${51 + i * 7}" width="${40 + (i * 9) % 18}" height="2" fill="#8b949e"/>`)}`,
  almanac: `<rect width="160" height="100" fill="#faf6ec"/><rect x="10" y="6" width="140" height="1.2" fill="#9a6a12"/><rect x="10" y="8.6" width="140" height=".5" fill="#9a6a12"/><rect x="44" y="12" width="72" height="5" fill="#222"/><rect x="10" y="21" width="140" height=".5" fill="#9a6a12"/>${R(10, i => `<rect x="10" y="${26 + i * 6.6}" width="66" height="1.6" fill="#6b6250"/><rect x="10" y="${28.6 + i * 6.6}" width="66" height=".3" fill="#9a6a12"/>`)}<rect x="80" y="24" width=".5" height="70" fill="#9a6a12"/>${R(6, i => `<rect x="84" y="${26 + i * 6.6}" width="38" height="1.6" fill="#6b6250"/>`)}<rect x="126" y="25" width="24" height="36" fill="#e9e1cc" stroke="#222" stroke-width=".4"/><path d="M134 29l4-1 3 2 1 4-2 4 2 4-3 5-4 1-2-4 1-5-2-4z" fill="#faf6ec" stroke="#222" stroke-width=".5"/>${R(3, i => `<rect x="84" y="${70 + i * 7}" width="66" height="1.6" fill="#6b6250"/>`)}`,
  glance: `<rect width="160" height="100" fill="#f2f4f5"/><rect x="52" y="4" width="56" height="96" rx="6" fill="#ffffff" stroke="#5b6670" stroke-width=".7"/><rect x="58" y="12" width="44" height="7" rx="2" fill="#ffffff" stroke="#0b5c7a" stroke-width=".8"/><rect x="61" y="14.5" width="20" height="2" fill="#111"/>${R(4, i => `<rect x="58" y="${25 + i * 11}" width="10" height="2.4" fill="#0b5c7a"/><rect x="70" y="${25 + i * 11}" width="32" height="2.4" fill="#111"/><rect x="58" y="${29.5 + i * 11}" width="38" height="2" fill="#5b6670"/>`)}<path d="M76 70l5-1 4 3 1 5-2 5 3 5-4 6-6 1-2-5 1-6-2-5z" fill="#f2f4f5" stroke="#111" stroke-width=".6"/>`,
};

// ---------- drawings for the main pages (viewBox 0 0 420 360), in the main design's colours ----------
// Neutral ink and accent only: the level colours mean levels and never appear on a card, so no
// card can be read as a current warning.
const INK = '#1d2329', MUTED = '#5b6670', ACC = '#0b5c7a', LINE = '#d9d4ca', LAND = '#e9e4d8', EDGE = '#6f7880';
const SANS = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
// A schematic outline of mainland Portugal, hand-drawn (not a boundary file).
const PT = 'M150 30 L215 22 L262 34 L276 70 L254 104 L262 140 L246 176 L262 214 L246 252 L262 292 L232 330 L178 336 L166 300 L150 262 L126 222 L118 176 L104 130 L120 84 Z';
const hexes = (cols, rows, r, x0, y0, style) => {
  let o = ''; const dx = r * Math.sqrt(3), dy = r * 1.5;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * dx + (j % 2 ? dx / 2 : 0), y = y0 + j * dy;
    o += `<path d="${R(6, k => { const a = Math.PI / 180 * (60 * k - 30); return `${k ? 'L' : 'M'}${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; })}Z" ${style(i, j)}/>`;
  }
  return o;
};
const hexPt = (k, r = 130) => { const a = -Math.PI / 2 + k * Math.PI / 3; return [210 + r * Math.cos(a), 180 + r * Math.sin(a)]; };
const DRAW = {
  home: `<path d="${PT}" fill="${LAND}" stroke="${EDGE}" stroke-width="3"/>${R(5, i => `<rect x="300" y="${80 + i * 46}" width="${60 + (i * 37) % 50}" height="12" rx="6" fill="${ACC}"/><rect x="300" y="${98 + i * 46}" width="100" height="5" rx="2.5" fill="${LINE}"/>`)}`,
  warnings: `<path d="${PT}" fill="${LAND}" stroke="${EDGE}" stroke-width="3"/><path d="M120 84 L254 104 M104 130 L262 140 M118 176 L246 176 M126 222 L262 214 M150 262 L246 252" stroke="#ffffff" stroke-width="4"/>${R(4, i => `<rect x="300" y="${120 + i * 34}" width="${40 + (i * 29) % 60}" height="14" rx="4" fill="none" stroke="${ACC}" stroke-width="3"/><rect x="${344 + (i * 29) % 60}" y="${120 + i * 34}" width="${36 - (i * 7) % 20}" height="14" rx="4" fill="${ACC}"/>`)}<line x1="318" y1="104" x2="318" y2="262" stroke="${INK}" stroke-width="2"/>`,
  forecasts: R(6, i => `<rect x="20" y="${40 + i * 52}" width="380" height="10" rx="5" fill="${LINE}"/><rect x="${70 + (i * 41) % 120}" y="${40 + i * 52}" width="${110 + (i * 23) % 60}" height="10" rx="5" fill="${ACC}"/><rect x="20" y="${58 + i * 52}" width="${60 + (i * 53) % 140}" height="6" rx="3" fill="${MUTED}" opacity=".5"/>`),
  observations: `<path d="${PT}" fill="${LAND}" stroke="${EDGE}" stroke-width="3"/>${R(34, i => { const x = 140 + ((i * 53) % 110), y = 50 + ((i * 89) % 270); return `<circle cx="${x}" cy="${y}" r="${i % 5 ? 7 : 4}" fill="${i % 5 ? ACC : 'none'}" stroke="${i % 5 ? EDGE : MUTED}" stroke-width="2"/>`; })}`,
  'fire-risk': `<clipPath id="pt"><path d="${PT}"/></clipPath><g clip-path="url(#pt)">${hexes(14, 26, 11, 90, 20, (i, j) => `fill="${(i * 7 + j * 3) % 9 ? LAND : '#cfc8b8'}" stroke="#ffffff" stroke-width="2"`)}</g><path d="${PT}" fill="none" stroke="${EDGE}" stroke-width="3"/>`,
  sea: `${R(4, i => `<path d="M0 ${70 + i * 26} C 50 ${50 + i * 26} 90 ${90 + i * 26} 140 ${70 + i * 26} S 230 ${50 + i * 26} 280 ${70 + i * 26} S 370 ${90 + i * 26} 420 ${70 + i * 26}" fill="none" stroke="${ACC}" stroke-width="${4 - i * 0.6}" opacity="${1 - i * 0.18}"/>`)}${R(4, i => `<rect x="30" y="${216 + i * 34}" width="360" height="1.5" fill="${LINE}"/><rect x="${80 + (i * 37) % 90}" y="${210 + i * 34}" width="${70 + (i * 43) % 90}" height="12" rx="6" fill="#2f6f9f"/>`)}`,
  uv: `<circle cx="330" cy="72" r="32" fill="none" stroke="${ACC}" stroke-width="5"/>${R(8, k => { const a = k * Math.PI / 4; return `<line x1="${330 + 44 * Math.cos(a)}" y1="${72 + 44 * Math.sin(a)}" x2="${330 + 58 * Math.cos(a)}" y2="${72 + 58 * Math.sin(a)}" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/>`; })}${R(16, k => `<rect x="${30 + (k % 4) * 66}" y="${150 + Math.floor(k / 4) * 50}" width="58" height="42" rx="5" fill="${['#ffffff', LAND, '#d6d0c2', '#c4bdae'][(k * 3 + Math.floor(k / 4)) % 4]}" stroke="${EDGE}" stroke-width="2"/>`)}`,
  'storm-charles': `${R(5, i => `<ellipse cx="210" cy="170" rx="${40 + i * 34}" ry="${30 + i * 27}" fill="none" stroke="${i ? MUTED : ACC}" stroke-width="${i ? 2.5 : 5}" opacity="${1 - i * 0.14}" transform="rotate(-18 210 170)"/>`)}`,
  'how-it-was-made': [['the brief', 30], ['agents, in rounds', 150], ['this site', 270]].map(([t, y], i) => `<rect x="60" y="${y}" width="300" height="70" rx="12" fill="#ffffff" stroke="${i === 2 ? ACC : EDGE}" stroke-width="3"/><text x="210" y="${y + 44}" text-anchor="middle" font-size="26" font-weight="600" fill="${INK}" font-family="${SANS}">${t}</text>${i < 2 ? `<path d="M210 ${y + 74} v40 m-10 -12 l10 12 l10 -12" fill="none" stroke="${ACC}" stroke-width="4"/>` : ''}`).join(''),
  place: `<path d="M210 40 C 160 40 130 78 130 120 C 130 176 210 236 210 236 C 210 236 290 176 290 120 C 290 78 260 40 210 40 Z" fill="${LAND}" stroke="${EDGE}" stroke-width="4"/><circle cx="210" cy="120" r="30" fill="#ffffff" stroke="${ACC}" stroke-width="6"/>${R(3, i => `<rect x="${40 + i * 118}" y="270" width="104" height="62" rx="10" fill="#ffffff" stroke="${i ? EDGE : ACC}" stroke-width="3"/><rect x="${54 + i * 118}" y="288" width="${50 + (i * 17) % 30}" height="8" rx="4" fill="${INK}"/><rect x="${54 + i * 118}" y="306" width="74" height="6" rx="3" fill="${MUTED}" opacity=".5"/>`)}`,
  'use-the-data': `<rect x="20" y="40" width="380" height="280" rx="12" fill="#ffffff" stroke="${EDGE}" stroke-width="3"/><rect x="20" y="40" width="380" height="36" rx="12" fill="${LAND}"/>${R(3, i => `<circle cx="${44 + i * 22}" cy="58" r="6" fill="${EDGE}"/>`)}<text x="44" y="122" font-size="26" fill="${ACC}" font-family="ui-monospace,Menlo,monospace">$ curl</text><text x="150" y="122" font-size="26" fill="${INK}" font-family="ui-monospace,Menlo,monospace">latest.json</text>${R(5, i => `<rect x="${44 + (i % 2) * 28}" y="${152 + i * 30}" width="${120 + (i * 61) % 180}" height="10" rx="5" fill="${i % 2 ? MUTED : INK}" opacity="${i % 2 ? 0.45 : 0.85}"/>`)}`,
  'use-with-ai': `<rect x="50" y="30" width="230" height="300" rx="10" fill="#ffffff" stroke="${EDGE}" stroke-width="3"/>${R(8, i => `<rect x="76" y="${66 + i * 30}" width="${100 + (i * 47) % 80}" height="9" rx="4" fill="${i ? MUTED : INK}" opacity="${i ? 0.45 : 1}"/>`)}<text x="350" y="210" text-anchor="middle" font-size="110" fill="${ACC}" font-family="ui-monospace,Menlo,monospace">{ }</text>`,
  'behind-the-scenes': `${R(6, k => { const [x, y] = hexPt(k), [x2, y2] = hexPt((k + 1) % 6); return `<line x1="210" y1="180" x2="${x}" y2="${y}" stroke="${LINE}" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="2"/>`; })}${R(6, k => { const [x, y] = hexPt(k); return `<circle cx="${x}" cy="${y}" r="30" fill="#ffffff" stroke="${k ? EDGE : ACC}" stroke-width="4"/>`; })}<circle cx="210" cy="180" r="38" fill="${ACC}"/>`,
};

// ---------- the cards ----------
const MAIN = { bg: '#f7f5f0', ink: INK, muted: MUTED, accent: ACC, band: '#fff4d6', bandInk: '#3b2f00', font: SANS };
const PAGES = [
  ['home', 'What the data says now', "Portugal's weather warnings, forecasts and readings, read live from public data, with the age of every file."],
  ['place', 'Your town', "One town's warnings, forecast, nearest station, sea, UV and fire risk, side by side, each with its source."],
  ['warnings', 'Warnings', "IPMA's yellow, orange and red warnings for the 25 areas, on a map and a timeline, with the towns in each."],
  ['forecasts', 'Forecasts', 'Five days for 35 places on one temperature scale: range, chance of rain, weather and wind.'],
  ['observations', 'Stations', "The latest hour's readings from IPMA's stations, on a map and in a table, with the nearest town."],
  ['fire-risk', 'Fire risk', "IPMA's fire risk class for 278 mainland municipalities, for three days."],
  ['sea', 'Sea', 'Wave heights and sea temperature for 12 coastal places, on one scale, with the towns nearby.'],
  ['uv', 'UV index', 'The UV index by place and day, in IPMA\'s bands, each place linked to its town.'],
  ['storm-charles', 'Storm Charles, archived', 'A fixed record of 10 to 12 November 2026: the archive of the storm site, read live.'],
  ['use-the-data', 'Use the data', 'The addresses, copy-paste examples in curl and JavaScript, the cards and their terms.'],
  ['how-it-was-made', 'How it was made', 'From a brief to this site: an agent team, its rounds, its checks and its record.'],
  ['use-with-ai', 'Use with AI', 'Markdown twins, llms.txt and the data addresses, with each source\'s terms.'],
  ['behind-the-scenes', 'Behind the scenes', 'The agent team that makes this site: roles, policies, rounds and commits.'],
];
const STYLE = {
  broadsheet: { bg: '#f4f1ea', ink: '#161616', muted: '#5a5a5a', accent: '#8a1c1c', band: '#161616', bandInk: '#f4f1ea', font: 'Charter,Iowan Old Style,Georgia,serif' },
  'chart-room': { bg: '#f3f0e4', ink: '#13324b', muted: '#3d5a6e', accent: '#13324b', band: '#13324b', bandInk: '#f3f0e4', font: SANS, caps: true },
  'night-desk': { bg: '#0d1117', ink: '#e6edf3', muted: '#8b949e', accent: '#5fb3d3', band: '#3a3110', bandInk: '#f4e6b8', font: SANS },
  almanac: { bg: '#faf6ec', ink: '#222222', muted: '#5e5644', accent: '#9a6a12', band: '#faf6ec', bandInk: '#222222', font: 'Charter,Iowan Old Style,Georgia,serif', rule: true },
  glance: { bg: '#ffffff', ink: '#111111', muted: '#4f5a63', accent: '#0b5c7a', band: '#fff4d6', bandInk: '#3b2f00', font: SANS },
};

function card({ title, line, drawing, st, kicker }) {
  const caps = st.caps ? 'font-variant:small-caps;letter-spacing:.06em;' : '';
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:${st.bg};color:${st.ink};font-family:${st.font};display:grid;grid-template-rows:1fr auto;position:relative}
.top{display:grid;grid-template-columns:620px 1fr;gap:40px;padding:58px 64px 24px;align-items:center}
.site{font-size:28px;font-weight:800;margin:0 0 4px}
.kick{font-size:22px;color:${st.muted};margin:0 0 28px;${caps}}
h1{font-size:${title.length > 16 ? 60 : 76}px;line-height:1.04;margin:0 0 20px;${caps}}
.line{font-size:30px;line-height:1.3;color:${st.muted};margin:0}
.art{display:flex;align-items:center;justify-content:center}
.art>svg{width:420px;height:360px}
.band{background:${st.band};color:${st.bandInk};padding:18px 64px 20px;font-size:25px;line-height:1.3;${st.rule ? `border-top:5px double ${st.accent};` : ''}}
.band strong{font-weight:700}.band span{display:block;font-size:20px;margin-top:4px}
.mark{position:absolute;left:64px;top:30px;width:90px;height:6px;background:${st.accent};border-radius:3px}
</style></head><body><div class="mark"></div>
<div class="top"><div><p class="site">${esc(SITE_NAME)}</p><p class="kick">${esc(kicker)}</p><h1>${esc(title)}</h1><p class="line">${esc(line)}</p></div>
<div class="art">${drawing}</div></div>
<div class="band"><strong>${esc(DISCLAIMER)}</strong><span>weather-demo.agenticcells.site · Data: IPMA and others, read live from data.promptugal.news · Not IPMA's site and not official</span></div>
</body></html>`;
}

// conductor.weather-demo@ (2026-11-18): only pages that exist in src/ get a card.
// developer.weather-demo@ (instance B): 'place' too, since its page is being built in the same round.
const exists = n => n === 'home' || n === 'behind-the-scenes' || n === 'place' || existsSync(`src/${n}/index.html`);
const jobs = [
  ...PAGES.filter(([n]) => exists(n)).map(([name, title, line]) => ({ name, html: card({ title, line, st: MAIN,
    kicker: name === 'home' ? 'Portugal\'s weather, from public data' : name === 'place' ? 'Pick a town, see every source' : 'A page of the site',
    drawing: `<svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg">${DRAW[name]}</svg>` }) })),
  ...designs.filter(d => d.slug !== 'main').map(d => ({ name: `d-${d.slug}`, html: card({ title: d.name, line: d.line, st: STYLE[d.slug],
    kicker: 'One of the designs of the same live data',
    drawing: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" style="width:440px;height:275px;border-radius:10px;box-shadow:0 0 0 2px ${STYLE[d.slug].muted}">${SCHEMATIC[d.slug]}</svg>` }) })),
];

// Render only when run directly (the chooser's generator may import SCHEMATIC).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { chromium } = require('playwright');
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  let bad = 0;
  for (const j of jobs) {
    await page.setContent(j.html, { waitUntil: 'load' });
    const f = `${OUT}/${j.name}.png`;
    writeFileSync(f, await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } }));
    const kb = Math.round(statSync(f).size / 1024);
    if (kb >= 300) bad++;
    console.log(`${f} ${kb} KB${kb >= 300 ? ' (too big: over 300 KB)' : ''}`);
  }
  await browser.close();
  if (bad) { console.error(`FAILED: ${bad} card(s) over 300 KB`); process.exit(1); }
  console.log(`OK: ${jobs.length} cards`);
}
