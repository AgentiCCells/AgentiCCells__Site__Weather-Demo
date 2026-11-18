// two-towns.js: the Two towns design, /d/two-towns/?id=a,b[,c]. Two or three towns side by side,
// block by block, rows aligned, on the scales every place already shares (forecast: all 35
// places; sea: all 12 coasts). The six files are read once for all towns; each row has one source
// line, since the same file serves every town, and a file that fails fails its row once. Nothing
// is guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance C), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md sections 2 and 5, with the conductor's decision D5 (at most
// three towns, team/rounds/2.md).

import { h, statusBand, termsBlock } from '/assets/js/data.js';
import { areaOf } from '/assets/js/places.js';
import { SOURCES, loadSix, renderBlock, summaryText, placesFromURL, townSelect, setTown, keepTown } from '/assets/js/place-blocks.js';

const NAME = 'Two towns';
const MIN = 2, MAX = 3; // D5: capped at three towns
const FALLBACK = [1110600, 1131200, 1080500];
const ROWS = { warnings: 'Warnings', forecasts: 'Forecast', observations: 'Nearest station', sea: 'Sea', uv: 'UV index', fire: 'Fire risk' };
const root = document.getElementById('d-root');
const mainLink = document.getElementById('d-main-link');
const vh = t => h('span', { class: 'pc-vh' }, t);
const and = names => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');

const { res, slow, loads } = loadSix({ onSlow: key => { if (!res[key]) { drawRow(key); drawBand(); } } });
let places = [], els = null, outcomes = [];

function build(msgs) {
  const n = places.length;
  const h1 = h('h1', { tabindex: '-1', id: 'tw-h1' }, `${and(places.map(p => p.name))} side by side`);
  const band = h('div', { class: 'tw-band' });
  const ids = places.map(p => p.id);
  const sel = townSelect({ id: 'tw-add', exclude: ids });
  const full = n >= MAX;
  if (full) sel.disabled = true;
  const form = h('form', { class: 'tw-add', action: '/d/two-towns/', method: 'get', onsubmit: e => { e.preventDefault(); if (places.length >= MAX) return; go([...ids, Number(sel.value)]); } },
    h('label', { for: 'tw-add' }, 'Add a town'), sel, h('button', { type: 'submit', class: 'tw-btn tw-btn-main', disabled: full }, 'Compare'),
    full ? h('span', { class: 'muted tw-full' }, `Up to ${MAX} towns; remove one to add another.`) : null);
  const heads = h('div', { class: 'tw-row tw-heads' }, h('div', { class: 'tw-label' }, vh('Towns')),
    places.map(p => h('div', { class: 'tw-cell tw-head' },
      h('h2', {}, p.name),
      h('p', { class: 'muted' }, `warning area ${areaOf(p)?.name || p.area}`),
      h('p', { class: 'tw-acts' },
        h('button', { type: 'button', class: 'tw-btn', 'aria-label': `Remove ${p.name}`, disabled: n <= MIN, onclick: () => go(ids.filter(x => x !== p.id)) }, 'Remove'),
        h('a', { href: `/place/?id=${p.id}` }, 'Open in Your town')))));
  const summaryCells = places.map(() => h('p', { class: 'tw-summary' }, 'Reading the six files for this town...'));
  const summary = h('section', { class: 'tw-row', 'aria-labelledby': 'tw-h-summary' },
    h('div', { class: 'tw-label' }, h('h3', { id: 'tw-h-summary' }, 'In short')),
    places.map((p, i) => h('div', { class: 'tw-cell' }, h('h4', { class: 'tw-town' }, p.name), summaryCells[i])));
  const rows = {};
  for (const S of SOURCES) {
    const state = h('span', { class: 'tw-state' });
    const cells = h('div', { class: 'tw-cells' });
    const prov = h('div', { class: 'tw-prov' });
    const el = h('section', { class: `tw-row tw-${S.key}`, 'aria-labelledby': `h-${S.key}` },
      h('div', { class: 'tw-label' }, h('h3', { id: `h-${S.key}`, tabindex: '-1' }, ROWS[S.key]), state), cells, prov);
    rows[S.key] = { el, state, cells, prov };
  }
  const terms = h('div', { class: 'terms-body' }, h('p', { class: 'muted' }, 'Reading the six source cards...'));
  const grid = h('div', { class: 'tw-grid', style: `--n:${n}` }, heads, summary, SOURCES.map(S => rows[S.key].el));
  root.replaceChildren(...msgs.map(m => h('p', { class: 'status warn tw-msg' }, m)), h1, band, form, grid,
    h('section', { class: 'pc-terms', 'aria-labelledby': 'terms' }, h('h2', { id: 'terms', tabindex: '-1' }, 'Terms'), terms));
  return { h1, band, rows, summaryCells, terms };
}

// One row: every town's body for one block, under one source line. A file not read (or still
// being read) gives one message across the row, not one per town.
function drawRow(key) {
  if (!els) return;
  const R = els.rows[key];
  const rs = places.map(p => renderBlock(key, p, res[key], { slow: slow[key] }));
  const r0 = rs[0];
  rs.forEach((r, i) => { if (r.outcome) outcomes[i][key] = r.outcome; });
  R.el.classList.remove('blk-stale', 'blk-old', 'blk-missing');
  const mark = r0.mark || rs.find(r => r.mark)?.mark;
  if (mark) R.el.classList.add(`blk-${mark}`);
  if (!res[key] || r0.mark === 'missing') R.cells.replaceChildren(h('div', { class: 'tw-cell tw-span' }, r0.body));
  else R.cells.replaceChildren(...places.map((p, i) => h('div', { class: 'tw-cell' }, h('h4', { class: 'tw-town' }, p.name), rs[i].body)));
  const lv = r0.level;
  R.state.replaceChildren(...(['stale', 'old', 'unknown', 'missing'].includes(lv)
    ? [h('strong', { class: `pl-state pl-${lv}` }, lv === 'missing' ? 'not read' : lv === 'unknown' ? 'read time unknown' : lv)] : []));
  R.prov.replaceChildren(r0.prov);
}

function drawBand() {
  if (!els) return;
  els.band.replaceChildren(statusBand(SOURCES.map(S => ({ id: S.id, name: S.name, href: `#h-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' }).el);
}

function finish(me) {
  if (els !== me) return;
  places.forEach((p, i) => { els.summaryCells[i].textContent = summaryText(p, outcomes[i], res); });
  els.terms.replaceChildren(termsBlock(SOURCES.map(S => res[S.key] || { id: S.id })));
}

function show(list, { focus = false, msgs = [] } = {}) {
  places = list;
  outcomes = places.map(() => ({}));
  els = build(msgs);
  for (const S of SOURCES) drawRow(S.key);
  drawBand();
  document.title = `${and(places.map(p => p.name))}, ${NAME} design | Weather, from our data`;
  if (mainLink) mainLink.href = `/place/?id=${places[0].id}`;
  keepTown(places[0]);
  if (focus) els.h1.focus();
  const me = els;
  for (const S of SOURCES) loads[S.key].then(() => { if (els === me) { drawRow(S.key); drawBand(); } });
  Promise.all(SOURCES.map(S => loads[S.key])).then(() => finish(me));
}

function go(ids) {
  setTown(ids);
  fromURL({ focus: true });
}

function fromURL({ focus = false } = {}) {
  const r = placesFromURL(location.search, { min: MIN, max: MAX, fallback: FALLBACK });
  const msgs = [];
  if (r.unknown.length) msgs.push(`No town has the id ${r.unknown.map(u => u.slice(0, 20)).join(', ')}; ${r.unknown.length === 1 ? 'it is' : 'they are'} left out.`);
  if (r.cut) msgs.push(`Showing the first ${MAX} towns of ${r.places.length + r.cut}.`);
  show(r.places, { focus, msgs });
}
addEventListener('popstate', () => fromURL({ focus: true }));
fromURL();
