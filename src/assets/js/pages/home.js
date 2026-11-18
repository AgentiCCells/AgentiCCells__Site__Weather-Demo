// pages/home.js: what the data says now. The status band, the country's warnings (map and table),
// one headline per source with its age, the town picker's last town, and the terms. Everything is
// read live from data.promptugal.news; nothing is guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance A), 2026-11-18, round 1, from
// team/rounds/1/design/PROPOSAL.md section 2. The warnings part and the shape of the status list
// follow the IPMA-Data cell's home page (AgentiCCells/AgentiCCells__Site__IPMA-Data,
// src/assets/js/pages/home.js, Apache-2.0, same organisation); the headlines are new.

import { loadSource, loading, failure, provenance, provLine, statusBand, termsBlock, sourceState, h } from '../data.js';
import { RCM_LEVELS, uvBand } from '../codes.js';
import { placeById } from '../places.js';
import { warningsBlock, warningTable, currentWarnings, levelsFor, warningWindows, lisbonNow, fmtPT } from '../map.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const today = () => lisbonNow().slice(0, 10);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// Our own headline from each file (proposal 2.4). index.json's headlines are not reused: its
// warnings line counts every area, not the areas with a warning (data notes, round 1).
const SOURCES = [
  { id: 'ipma-warnings', name: 'Warnings', href: '/warnings/', head: d => {
    const c = currentWarnings(d.active);
    if (!c.rows.length) return "No yellow, orange or red warning in IPMA's file for now or later.";
    const by = {}; for (const w of c.rows) by[w.level] = (by[w.level] || 0) + 1;
    const lv = ['yellow', 'orange', 'red'].filter(l => by[l]).map(l => `${by[l]} ${l}`);
    const nowN = Object.values(levelsFor(d.active, warningWindows()[0])).filter(x => x.level !== 'green').length;
    return `${lv.length > 1 ? lv.slice(0, -1).join(', ') + ' and ' + lv.at(-1) : lv[0]} warning${c.rows.length === 1 ? '' : 's'} in force or upcoming, in ${c.areas} of 25 areas; ${plural(nowN, 'area')} with one in force now.`;
  } },
  { id: 'ipma-city-forecasts', name: 'Forecasts', href: '/forecasts/', head: d => {
    const cs = d.cities || [];
    const days = Math.max(0, ...cs.map(c => (c.days || []).filter(x => x.date >= today()).length));
    const run = cs.map(c => c.updated).filter(Boolean).sort().pop();
    return `${plural(cs.length, 'place')}, ${plural(days, 'day')} from today${run ? `; IPMA's run ${fmtPT(run)} (IPMA's time, as given)` : ''}.`;
  } },
  { id: 'ipma-observations', name: 'Stations', href: '/observations/', head: d => {
    const st = d.stations || [];
    const rep = st.filter(s => s.reading);
    const hour = d.hour_utc ? `${d.hour_utc.slice(11, 16)} UTC` : 'an unknown hour';
    const t = rep.filter(s => isNum(s.reading.temp_c)).sort((a, b) => b.reading.temp_c - a.reading.temp_c);
    return `${rep.length} of ${st.length} stations sent a reading for ${hour}${t.length ? `; warmest ${t[0].name} ${t[0].reading.temp_c} °C, coolest ${t.at(-1).name} ${t.at(-1).reading.temp_c} °C` : '; none gave a temperature'}.`;
  } },
  { id: 'ipma-fire-risk', name: 'Fire risk', href: '/fire-risk/', head: d => {
    const ms = d.municipalities || [];
    const t = today();
    const cls = ms.map(m => (m.days || []).find(x => x.date === t)?.rcm).filter(c => RCM_LEVELS[c]);
    if (!cls.length) return `${ms.length} mainland municipalities, but no class for today (${t}) in the file.`;
    const by = {}; for (const c of cls) by[c] = (by[c] || 0) + 1;
    const keys = Object.keys(by).sort();
    if (keys.length === 1 && cls.length === ms.length) return `Today: all ${ms.length} mainland municipalities in class ${keys[0]} (${RCM_LEVELS[keys[0]].name.toLowerCase()}).`;
    return `Today, of ${ms.length} mainland municipalities: ${keys.map(k => `${by[k]} in class ${k} (${RCM_LEVELS[k].name.toLowerCase()})`).join(', ')}.`;
  } },
  { id: 'ipma-sea', name: 'Sea', href: '/sea/', head: d => {
    const cs = d.coasts || [];
    const t = today();
    const vals = cs.map(c => ({ c, v: (c.days || []).find(x => x.date === t)?.sea_max_m })).filter(x => isNum(x.v));
    if (!vals.length) return `${plural(cs.length, 'coast')}; no total sea value for today.`;
    // Every coast at the highest value: named up to three, counted above that.
    const max = Math.max(...vals.map(x => x.v));
    const top = vals.filter(x => x.v === max);
    const where = top.length > 3 ? `${top.length} coasts` : top.map(x => x.c.name).join('; ');
    return `${plural(cs.length, 'coast')}; highest total sea today up to ${max} m (${where}).`;
  } },
  { id: 'ipma-uv', name: 'UV', href: '/uv/', head: d => {
    const t = today();
    // Only named places with a real id (never id 0, nor an id with no name such as 1081525).
    const vals = (d.places || []).filter(p => Number(p.id) > 0 && p.name).flatMap(p => (p.days || []).filter(x => x.date === t && isNum(x.index)).map(x => ({ p, v: x.index })));
    if (!vals.length) return `No UV value for today (${t}) in the file.`;
    const top = vals.sort((a, b) => b.v - a.v)[0];
    const b = uvBand(top.v);
    return `Highest UV today: ${top.v}${b ? ` (${b.name.toLowerCase()})` : ''}, ${top.p.name}.`;
  } },
  { id: 'meteoalarm-pt', name: 'MeteoAlarm (context)', href: '/warnings/', context: true, head: d => {
    const ms = d.messages || [];
    const n = ms.filter(m => Date.parse(m.expires_utc) > Date.now()).length;
    return `${n} of ${ms.length} messages not expired, as relayed from IPMA. The same warnings in English, not a second source.`;
  } },
  { id: 'storm-charles-archive', name: 'Storm Charles archive', href: '/storm-charles/', archive: true, head: d => {
    const c = d.counts || {};
    return `A fixed record of the Storm Charles site (10 to 12 November 2026): ${c.files ?? 'an unknown number of'} files, ${c.verified ?? 'an unknown number'} verified.`;
  } },
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
