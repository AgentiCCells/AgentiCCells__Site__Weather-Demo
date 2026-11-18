// pages/home.js: what the data says now. The status band, the country's warnings (map and table),
// one headline per source with its age, the town picker's last town, and the terms. Everything is
// read live from data.promptugal.news; nothing is guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance A), 2026-11-18, round 1, from
// team/rounds/1/design/PROPOSAL.md section 2. The warnings part and the shape of the status list
// follow the IPMA-Data cell's home page (AgentiCCells/AgentiCCells__Site__IPMA-Data,
// src/assets/js/pages/home.js, Apache-2.0, same organisation); the headlines are new.

import { loadSource, loading, failure, provenance, provLine, statusBand, termsBlock, sourceState, h } from '../data.js';
import { HEADLINES } from '../headlines.js';
import { placeById } from '../places.js';
import { warningsBlock, warningTable, currentWarnings } from '../map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';

// Our own headline from each file (proposal 2.4), from headlines.js (moved there in round 2 by
// instance D, unchanged, so the Workbench design can use them too).
const SOURCES = [
  { id: 'ipma-warnings', name: 'Warnings', href: '/warnings/', head: HEADLINES['ipma-warnings'] },
  { id: 'ipma-city-forecasts', name: 'Forecasts', href: '/forecasts/', head: HEADLINES['ipma-city-forecasts'] },
  { id: 'ipma-observations', name: 'Stations', href: '/observations/', head: HEADLINES['ipma-observations'] },
  { id: 'ipma-fire-risk', name: 'Fire risk', href: '/fire-risk/', head: HEADLINES['ipma-fire-risk'] },
  { id: 'ipma-sea', name: 'Sea', href: '/sea/', head: HEADLINES['ipma-sea'] },
  { id: 'ipma-uv', name: 'UV', href: '/uv/', head: HEADLINES['ipma-uv'] },
  { id: 'meteoalarm-pt', name: 'MeteoAlarm (context)', href: '/warnings/', context: true, head: HEADLINES['meteoalarm-pt'] },
  { id: 'storm-charles-archive', name: 'Storm Charles archive', href: '/storm-charles/', archive: true, head: HEADLINES['storm-charles-archive'] },
];
const CURRENT = SOURCES.filter(s => !s.archive); // the seven the status band speaks for
const res = {}, slow = {};
const loads = Object.fromEntries(SOURCES.map(S => [S.id, loadSource(S.id, { onSlow: () => { slow[S.id] = true; paintRow(S); band(); } }).then(r => { res[S.id] = r; return r; })]));

// ---------- the status band ----------
function band() {
  const { el } = statusBand(CURRENT.map(S => ({ id: S.id, name: S.name, href: `#src-${S.id}`, src: res[S.id] || null, slow: slow[S.id] })), { what: 'sources' });
  document.getElementById('band').replaceChildren(el);
}

// ---------- the headline rows ----------
const ul = document.getElementById('heads');
const rows = Object.fromEntries(SOURCES.map(S => [S.id, h('li', { id: `src-${S.id}` })]));
ul.replaceChildren(...SOURCES.map(S => rows[S.id]));
function paintRow(S) {
  const li = rows[S.id], src = res[S.id];
  const st = sourceState(src || null, { slow: slow[S.id] });
  const level = S.archive && src?.latest?.ok ? 'archive' : st.level;
  const word = { fresh: 'fresh', stale: 'stale', old: 'old', unknown: 'read time unknown', missing: 'not read', reading: 'reading', slow: 'still reading', archive: 'archived' }[level];
  let line;
  if (!src) line = h('p', { class: 'muted' }, slow[S.id] ? 'Still reading: data.promptugal.news is slow to answer.' : 'Reading from data.promptugal.news...');
  else if (!src.latest.ok) line = h('p', {}, h('strong', {}, 'Could not read: '), `${src.latest.error}. Nothing is shown in its place.`);
  else { let t; try { t = S.head(src.latest.data); } catch { t = null; } line = h('p', {}, t || 'The file was read but its shape has changed, so no headline is given.'); }
  const extra = S.context && src?.latest?.ok && src.latest.data.attribution ? [h('a', { href: S.href }, "MeteoAlarm's disclaimer, on the warnings page"), ' · ', h('a', { href: src.latest.data.attribution.meteoalarm || 'https://www.meteoalarm.org/' }, 'meteoalarm.org')] : null;
  // MeteoAlarm's terms ask re-users to publish its disclaimer: print it as latest.json gives it.
  const disclaimer = S.context && src?.latest?.ok ? h('p', { class: 'note' }, h('strong', {}, "MeteoAlarm's disclaimer: "),
    src.latest.data.attribution?.disclaimer || h('em', {}, 'the disclaimer was not in the file; see www.meteoalarm.org.')) : null;
  li.replaceChildren(h('span', { class: `hl-word hl-${level}` }, h('span', { class: `dot d-${level === 'missing' ? 'fail' : ['fresh', 'stale', 'old'].includes(level) ? level : 'unknown'}`, 'aria-hidden': 'true' }), word),
    ' ', h('a', { class: 'hl-name', href: S.href }, S.name), line, ...(disclaimer ? [disclaimer] : []), provLine(src || { id: S.id }, { slow: slow[S.id], archive: S.archive, extra }));
}
SOURCES.forEach(paintRow);
band();
for (const S of SOURCES) loads[S.id].then(() => { paintRow(S); band(); });
Promise.all(Object.values(loads)).then(all => document.getElementById('terms-body').replaceChildren(termsBlock(all)));

// ---------- warnings: map and table (as IPMA-Data's home page) ----------
(async () => {
  const block = document.getElementById('warnings-block');
  const table = document.getElementById('warnings-table');
  const slowB = loading(block, "IPMA's warnings");
  const slowT = loading(table, "IPMA's warnings");
  const t = setTimeout(() => { slowB(); slowT(); }, 4000);
  const [W, F] = await Promise.all([loads['ipma-warnings'], loads['ipma-fire-risk']]);
  clearTimeout(t);
  if (!W.latest.ok || !Array.isArray(W.latest.data.active)) {
    const r = W.latest.ok ? { ...W.latest, error: 'the file was read but its shape has changed' } : W.latest;
    failure(block, "IPMA's warnings", r, IPMA_WARN);
    failure(table, "IPMA's warnings", r, IPMA_WARN);
    return;
  }
  warningsBlock(block, W, F, { tableId: 'w-table-h' });
  const n = currentWarnings(W.latest.data.active).rows.length;
  const fold = h('details', { class: 'fold', open: matchMedia('(min-width: 760px)').matches },
    h('summary', {}, n ? `Show the ${n} warning${n === 1 ? '' : 's'} as a table` : 'Show the table', ' ', h('span', { class: 'muted' }, '(area, level, type, from, to)')),
    h('div', { class: 'panel' }, warningTable(W.latest.data.active)));
  table.replaceChildren(fold, provenance(W));
  block.querySelector('.skiplink')?.addEventListener('click', () => { fold.open = true; });
})();

// ---------- your last town (a convenience only) ----------
try {
  const p = placeById(localStorage.getItem('wd-last-town'));
  if (p) {
    document.getElementById('last-town').replaceChildren('Your last town: ', h('a', { href: `/place/?id=${p.id}` }, p.name), '.');
    const sel = document.getElementById('town'); if (sel) sel.value = String(p.id);
  }
} catch { /* storage blocked: nothing to show */ }
