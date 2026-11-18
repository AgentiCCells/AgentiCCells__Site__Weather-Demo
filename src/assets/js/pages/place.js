// pages/place.js: the place view, /place/?id=<globalIdLocal>. One of IPMA's 35 forecast places,
// with its warnings, five-day forecast, nearest station, sea, UV and fire risk side by side. Each
// block reads its own latest.json from data.promptugal.news, and loads, fails and goes stale on
// its own, with its own provenance line; nothing is guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance A), 2026-11-18, round 1, from
// team/rounds/1/design/PROPOSAL.md section 1 and the conductor's decisions D1 to D6
// (team/rounds/1.md). The joins are the analyst's (places.js); the warnings windows, swatches and
// Portugal-time helpers are map.js's; the forecast and UV drawings follow the IPMA-Data cell's
// pages (AgentiCCells/AgentiCCells__Site__IPMA-Data, src/assets/js/pages/home.js and uv.js,
// Apache-2.0, same organisation), rewritten for one place.
// Round 2: the block renderers and the pure helpers moved to ../place-blocks.js (instance C),
// so the designs under /d/ can import them; this page keeps its picker, card layout and history.

import { getJSON, statusBand, termsBlock, h } from '../data.js';
import { placeById, areaOf, byPlaceFor, slug } from '../places.js';
import { swatch, levelsFor, warningWindows } from '../map.js';
import { SOURCES, loadSix, renderBlock, summaryText, howTable, fetchSnippet, copyText, stormLine } from '../place-blocks.js';

const API = 'https://data.promptugal.news/api/v1';
const LAST = 'wd-last-town';
const vh = t => h('span', { class: 'pc-vh' }, t);

// ---------- state ----------
let res = {};          // key -> loadSource() result, once read
let slow = {};         // key -> true after SLOW_MS without an answer
let loads = {};        // key -> promise
let current = null;    // the place shown
let els = null;        // the card's elements

function startLoads() {
  ({ res, slow, loads } = loadSix({ onSlow: key => { if (!res[key]) { fillBlock(key); updateBand(); } } }));
}

// ---------- the picker ----------
const picker = document.getElementById('picker');
const towns = document.getElementById('towns');
const filter = document.getElementById('town-filter');
const count = document.getElementById('town-count');
const wide = matchMedia('(min-width: 900px)');
const links = [...towns.querySelectorAll('a[data-id]')];

function setupPicker() {
  document.getElementById('picker-find').hidden = false;
  const run = () => {
    const q = slug(filter.value);
    let n = 0;
    for (const a of links) {
      const show = !q || slug(a.dataset.name || a.textContent).includes(q);
      a.parentElement.hidden = !show; if (show) n++;
    }
    for (const ul of towns.querySelectorAll('ul')) {
      const any = [...ul.children].some(li => !li.hidden);
      ul.hidden = !any; ul.previousElementSibling.hidden = !any;
    }
    count.textContent = `${n} of ${links.length} towns`;
  };
  for (const a of links) a.dataset.name = a.textContent;
  filter.addEventListener('input', run);
  filter.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { const a = links.find(x => !x.parentElement.hidden); if (a) { e.preventDefault(); a.focus(); } }
    if (e.key === 'Escape' && filter.value) { filter.value = ''; run(); }
  });
  run();
  towns.addEventListener('click', e => {
    const a = e.target.closest('a[data-id]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const p = placeById(a.dataset.id);
    if (!p) return;
    history.pushState({ id: p.id }, '', `/place/?id=${p.id}`);
    choose(p, { focus: true });
  });
  wide.addEventListener('change', () => { if (wide.matches) picker.open = true; });
}

function markPicker() {
  for (const a of links) {
    if (Number(a.dataset.id) === current?.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  picker.querySelector('summary').replaceChildren(current ? 'Choose another town ' : 'Choose a town ', h('span', { class: 'muted' }, `(${links.length})`));
}

// Once the warnings file is read, each town link carries its area's level now (swatch and words).
function paintPicker() {
  const W = res.warnings;
  if (!W?.latest?.ok || !Array.isArray(W.latest.data.active)) return;
  const by = levelsFor(W.latest.data.active, warningWindows()[0]);
  for (const a of links) {
    const p = placeById(a.dataset.id); if (!p) continue;
    const l = by[p.area]?.level || 'green';
    a.replaceChildren(l === 'green' ? '' : swatch(l), a.dataset.name, vh(l === 'green' ? ', no warning now' : `, ${l} warning now`));
  }
}

// ---------- the card ----------
function section(key, title) {
  const body = h('div', { class: 'blk-body' });
  const prov = h('div', { class: 'blk-prov' });
  const el = h('section', { class: `blk blk-${key}`, 'aria-labelledby': `h-${key}` }, h('h2', { id: `h-${key}` }, title), body, prov);
  return { el, body, prov };
}

function buildCard(p) {
  const area = areaOf(p);
  const region = area?.region === 'mainland' ? 'mainland' : area?.region === 'madeira' ? 'Madeira' : 'Azores';
  const h1 = h('h1', { tabindex: '-1' }, p.name);
  const band = h('div', { class: 'pc-band' });
  const copyMsg = h('span', { class: 'muted', role: 'status' });
  const copyBtn = h('button', { type: 'button', class: 'pc-btn', onclick: () => copyText(location.href, copyMsg) }, 'Copy link to this town');
  const blocks = {
    warnings: section('warnings', 'Warnings, now and the next days'),
    forecasts: section('forecasts', 'Forecast, five days'),
    observations: section('observations', 'Nearest station'),
    sea: section('sea', 'Sea'),
    uv: section('uv', 'UV index'),
    fire: section('fire', 'Fire risk'),
  };
  const summary = h('p', { class: 'pc-summary', 'aria-live': 'polite' }, 'Reading the six files for this town...');
  const howBody = h('div');
  const how = h('details', { class: 'pc-how', ontoggle: e => { if (e.target.open) seeAlso(howBody); } },
    h('summary', {}, 'How this card was put together'), howBody);
  const terms = h('section', { class: 'pc-terms', 'aria-labelledby': 'terms' }, h('h2', { id: 'terms', tabindex: '-1' }, 'Terms'), h('div', { class: 'terms-body' }, h('p', { class: 'muted' }, 'Reading the six source cards...')));
  const storm = stormLine(p);
  const card = h('article', { class: 'pc-card', 'aria-labelledby': 'pc-h1' },
    h('header', { class: 'pc-head' }, Object.assign(h1, { id: 'pc-h1' }),
      h('p', { class: 'pc-sub' }, `Warning area ${area?.name || p.area} (${p.area}) · ${region} · forecast place ${p.id}`),
      band, h('p', { class: 'pc-copy' }, copyBtn, ' ', copyMsg)),
    summary,
    blocks.warnings.el,
    blocks.forecasts.el,
    h('div', { class: 'pc-grid' }, blocks.observations.el, blocks.sea.el, blocks.uv.el, blocks.fire.el),
    storm, how, terms);
  return { card, h1, band, summary, blocks, howBody, terms: terms.querySelector('.terms-body') };
}

const outcome = {}; // key -> { clause, how } for the current place

function fillBlock(key) {
  if (!els || !current) return;
  const B = els.blocks[key];
  B.el.classList.remove('blk-stale', 'blk-old', 'blk-missing');
  const r = renderBlock(key, current, res[key], { slow: slow[key] });
  B.body.replaceChildren(...r.body);
  if (r.outcome) outcome[key] = r.outcome;
  if (r.mark) B.el.classList.add(`blk-${r.mark}`);
  B.prov.replaceChildren(r.prov);
}

function updateBand() {
  if (!els) return;
  const { el } = statusBand(SOURCES.map(S => ({ id: S.id, name: S.name, href: `#h-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' });
  els.band.replaceChildren(el);
}

function finish() {
  if (!els || !current) return;
  // Summary: only from values on the card; a clause from a stale or old file carries its age.
  els.summary.textContent = summaryText(current, outcome, res);
  els.terms.replaceChildren(termsBlock(SOURCES.map(S => res[S.key] || { id: S.id })));
  els.howBody.replaceChildren(
    h('p', {}, 'Each block reads one file and picks the record for this town. The joins are in ', h('a', { href: '/assets/js/places.js' }, 'places.js'), '; nothing is copied into this site.'),
    howTable(current, outcome),
    h('p', {}, 'The forecast for this town, in your own JavaScript (no key, CORS open):'),
    h('pre', { class: 'pc-code' }, h('code', {}, fetchSnippet(current))),
    h('p', { class: 'see-also muted' }));
}


// Where data.promptugal.news has its own by-place file for this town, link it (Algarve only).
async function seeAlso(root) {
  const el = root.querySelector('.see-also'); if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  const r = await getJSON(`${API}/by-place/now/index.json`);
  if (!r.ok) { el.textContent = `data.promptugal.news's own by-place index could not be read (${r.error}).`; return; }
  const e = byPlaceFor(current, r.data);
  el.replaceChildren(...(e?.url
    ? ['See also: data.promptugal.news\'s own ', h('a', { href: e.url }, `by-place file for ${current.name}`), '. It covers 18 Algarve places only and is built from the same files, so it is never fresher than they are.']
    : [`data.promptugal.news has no by-place file for ${current.name} (its by-place files cover 18 Algarve places only).`]));
}

// ---------- choosing a town ----------
function choose(p, { focus = false } = {}) {
  current = p;
  for (const k of Object.keys(outcome)) delete outcome[k];
  els = buildCard(p);
  document.getElementById('card').replaceChildren(els.card);
  document.title = `${p.name}: weather from our data`;
  try { localStorage.setItem(LAST, String(p.id)); } catch { /* a convenience only */ }
  markPicker();
  if (!wide.matches) picker.open = false;
  for (const S of SOURCES) fillBlock(S.key);
  updateBand();
  if (focus) els.h1.focus();
  const me = p;
  for (const S of SOURCES) loads[S.key].then(() => { if (current === me) { fillBlock(S.key); updateBand(); if (S.key === 'warnings') paintPicker(); } });
  Promise.all(SOURCES.map(S => loads[S.key])).then(() => { if (current === me) finish(); });
}

const intro = document.getElementById('intro');
function showIntro(msg) {
  current = null; els = null;
  document.getElementById('card').replaceChildren(intro);
  document.getElementById('place-msg').textContent = msg || '';
  document.title = 'Your town | Weather, from our data';
  picker.open = true;
  markPicker();
}

function fromURL({ focus = false } = {}) {
  const raw = new URLSearchParams(location.search).get('id');
  if (raw === null || raw === '') { showIntro(); return; }
  const p = placeById(raw);
  if (!p) { showIntro(`Choose a town: no town has the id ${raw.slice(0, 20)}.`); return; }
  choose(p, { focus });
}

startLoads();
setupPicker();
loads.warnings.then(paintPicker);
addEventListener('popstate', () => fromURL({ focus: true }));
fromURL();
