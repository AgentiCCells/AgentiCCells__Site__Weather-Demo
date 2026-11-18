// large-print.js: the Large print design, /d/large-print/?id=<globalIdLocal>. The place card as
// short sentences and tables, one column, a 22 px base, AAA contrast and 48 px targets. Charts
// become tables; every section keeps its source line and its own failure and stale states
// (renderBlock in place-blocks.js decides those; this file only words the values). Nothing is
// guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance C), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md sections 2 and 7.

import { h, statusBand, termsBlock, fmtDay } from '/assets/js/data.js';
import { findForecast, findSea, findUV, SEA_NEAR_KM } from '/assets/js/places.js';
import { WEATHER_TYPES, WIND_CLASS, uvBand } from '/assets/js/codes.js';
import { swatch, levelsFor, warningWindows, levelWord, lisbonNow, areaName } from '/assets/js/map.js';
import {
  SOURCES, loadSix, renderBlock, summaryClauses, liveSpells, stormLine, placesFromURL, townSelect, setTown, keepTown,
} from '/assets/js/place-blocks.js';

const NAME = 'Large print';
const root = document.getElementById('d-root');
const mainLink = document.getElementById('d-main-link');
const TITLE = { warnings: 'Warnings', forecasts: 'Forecast', observations: 'Nearest station', sea: 'Sea', uv: 'UV index', fire: 'Fire risk' };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const today = () => lisbonNow().slice(0, 10);
const longDay = ymd => { const d = new Date(`${ymd}T12:00:00Z`); return isNaN(d) ? ymd : `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const dayName = ymd => ymd === today() ? `Today, ${fmtDay(ymd)}` : fmtDay(ymd);
const longPT = t => typeof t === 'string' && t.length >= 16 ? `${longDay(t.slice(0, 10))} ${t.slice(11, 16)}` : 'an unknown time';
const rng = (a, b, u) => isNum(a) && isNum(b) ? (a === b ? `${a} ${u}` : `${a} to ${b} ${u}`) : 'not given';
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const SHAPE = "the file's shape has changed";

const { res, slow, loads } = loadSix({ onSlow: key => { if (!res[key]) { drawSection(key); drawBand(); } } });
let current = null, els = null;
const outcome = {};

// A table that stacks on narrow screens (table.stack in site.css): each cell carries its label.
function table(caption, heads, rows, { stack = true } = {}) {
  return h('div', { class: 'table-wrap' }, h('table', { class: stack ? 'stack lp-table' : 'lp-table' }, h('caption', {}, caption),
    h('thead', {}, h('tr', {}, heads.map(x => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map(r => h('tr', {}, r.map((c, i) => i === 0 ? h('th', { scope: 'row' }, c) : h('td', { 'data-label': heads[i] }, c)))))));
}

// ---------- the sections in words and tables ----------
function lpWarnings(p, L) {
  const now = lisbonNow();
  const wins = warningWindows(now);
  const name = { now: 'Now', today: 'Today', tomorrow: 'Tomorrow', after: 'The day after' };
  const out = [table(`Highest warning level for the ${areaName(p.area)} area`, ['When', 'Level'], wins.map(w => {
    const l = levelsFor(L.active, w)[p.area]?.level || 'green';
    return [name[w.id] || w.label, h('span', { class: 'lp-level' }, swatch(l), l === 'green' ? 'None' : levelWord(l), l === 'green' ? h('span', { class: 'pc-vh' }, ': no yellow, orange or red warning') : null)];
  }), { stack: false })];
  const { live, ended } = liveSpells(p, L, now);
  if (!live.length) out.push(h('p', {}, `No yellow, orange or red warning for the ${areaName(p.area)} area in IPMA's file.`));
  for (const w of live) {
    const same = w.start.slice(0, 10) === w.end.slice(0, 10);
    out.push(h('p', { class: 'lp-spell' }, swatch(w.level), h('span', {},
      h('strong', {}, `${levelWord(w.level)} warning for ${w.type || w.type_pt || 'a type not given'}`),
      `, from ${longPT(w.start)} to ${same ? w.end.slice(11, 16) : longPT(w.end)}, Portugal time.`, w.start <= now ? ' In force now.' : '')));
    if (w.text) out.push(h('details', { lang: 'pt', class: 'lp-text' }, h('summary', { lang: 'en-GB' }, "IPMA's text, in Portuguese"), h('p', {}, w.text)));
  }
  if (ended) out.push(h('p', { class: 'lp-note' }, `${plural(ended, 'spell')} already ended ${ended === 1 ? 'is' : 'are'} not shown.`));
  out.push(h('p', { class: 'lp-note' }, h('a', { href: '/warnings/' }, 'All warnings on the map'), '.'));
  return out;
}

function lpForecast(p, L) {
  const c = findForecast(p, L);
  const t = today();
  const all = (c.days || []).filter(d => typeof d.date === 'string');
  const days = all.filter(d => d.date >= t);
  if (!days.length) return null; // the shared renderer words this case
  const out = [table(`Forecast for ${p.name}, from IPMA`, ['Day', 'Lowest', 'Highest', 'Chance of rain', 'Weather', 'Wind'], days.map(d => [
    dayName(d.date),
    isNum(d.t_min_c) ? `${d.t_min_c} °C` : 'not given',
    isNum(d.t_max_c) ? `${d.t_max_c} °C` : 'not given',
    isNum(d.rain_prob_pct) ? `${d.rain_prob_pct}%` : 'not given',
    d.weather_type > 0 && WEATHER_TYPES[d.weather_type] ? WEATHER_TYPES[d.weather_type] : 'not given',
    d.wind_dir ? `${d.wind_dir}${WIND_CLASS[d.wind_class] ? ', ' + WIND_CLASS[d.wind_class].toLowerCase() : ''}` : 'not given',
  ]))];
  const dropped = all.length - days.length;
  out.push(h('p', { class: 'lp-note' }, c.updated ? `IPMA's forecast run: ${longPT(c.updated)} (IPMA's time, as given).` : 'IPMA gives no run time for this place.',
    dropped ? ` ${plural(dropped, 'day')} before today ${dropped === 1 ? 'is' : 'are'} not shown.` : ''));
  return out;
}

function lpSea(p, L) {
  const f = findSea(p, L);
  if (!f || !f.near) return null; // the shared renderer's sentence is already words
  const t = today();
  const days = (f.coast.days || []).filter(d => typeof d.date === 'string' && d.date >= t);
  if (!days.length) return null;
  return [h('p', {}, h('strong', {}, f.coast.name), `, ${f.km} km away (within ${SEA_NEAR_KM} km, this site's choice).`),
    table(`Sea at ${f.coast.name}, from IPMA`, ['Day', 'Total sea', 'Swell', 'Sea temperature'], days.map(d => [
      dayName(d.date), rng(d.sea_min_m, d.sea_max_m, 'm'),
      `${rng(d.waves_min_m, d.waves_max_m, 'm')}${d.wave_dir && isNum(d.waves_min_m) ? ', from ' + d.wave_dir : ''}`,
      rng(d.sea_temp_min_c, d.sea_temp_max_c, '°C')]))];
}

function lpUV(p, L) {
  const f = findUV(p, L);
  if (!f) return null;
  const t = today();
  const dates = [...new Set((f.uv.days || []).map(d => d.date).filter(Boolean))].sort().filter(d => d >= t);
  if (!dates.length) return null;
  const say = d => {
    const v = (f.uv.days || []).filter(x => x.date === d).map(x => x.index);
    if (v.length === 1 && isNum(v[0])) { const b = uvBand(v[0]); return `${v[0]}${b ? `, ${b.name.toLowerCase()}` : ''}.`; }
    if (v.length > 1) return `IPMA gives ${v.length} values: ${v.map(x => isNum(x) ? x : 'no value').join(' and ')}.`;
    return 'no value.';
  };
  const out = [];
  if (!f.exact) out.push(h('p', {}, `IPMA gives no UV for ${p.name}. Shown: `, h('strong', {}, f.place.name), `, ${f.km} km away.`));
  out.push(h('p', { class: 'lp-big' }, `${dates[0] === t ? 'Today' : longDay(dates[0])}: ${say(dates[0])}`));
  if (dates.length > 1) out.push(h('ul', { class: 'lp-list' }, dates.slice(1).map(d => h('li', {}, `${longDay(d)}: ${say(d)}`))));
  return out;
}

const LP = { warnings: lpWarnings, forecasts: lpForecast, sea: lpSea, uv: lpUV };

// ---------- the page ----------
function section(key) {
  const body = h('div', { class: 'lp-body' });
  const prov = h('div', { class: 'lp-prov' });
  const el = h('section', { class: 'lp-sec', 'aria-labelledby': `h-${key}` }, h('h2', { id: `h-${key}`, tabindex: '-1' }, TITLE[key]), body, prov);
  return { el, body, prov };
}

function build(p, msg) {
  const secs = Object.fromEntries(SOURCES.map(S => [S.key, section(S.key)]));
  const h1 = h('h1', { tabindex: '-1' }, p.name);
  const band = h('div');
  const short = h('div', { class: 'lp-short', 'aria-live': 'polite' }, h('p', {}, 'Reading the six files for this town...'));
  const sel = townSelect({ id: 'lp-town', selected: p.id });
  const form = h('form', { class: 'lp-pick', action: '/d/large-print/', method: 'get', onsubmit: e => { e.preventDefault(); const id = Number(sel.value); if (id !== current.id) { setTown([id]); show(placesFromURL(`?id=${id}`).places[0], { focus: true }); } } },
    h('label', { for: 'lp-town' }, 'Choose another town'), sel, h('button', { type: 'submit', class: 'lp-btn' }, 'Show'));
  const terms = h('div', { class: 'terms-body' }, h('p', {}, 'Reading the six source cards...'));
  root.replaceChildren(...[msg ? h('p', { class: 'status warn' }, msg) : null, h1, form, band,
    h('section', { class: 'lp-sec', 'aria-labelledby': 'h-short' }, h('h2', { id: 'h-short' }, 'In short'), short),
    ...SOURCES.map(S => secs[S.key].el), stormLine(p),
    h('section', { class: 'lp-sec', 'aria-labelledby': 'terms' }, h('h2', { id: 'terms', tabindex: '-1' }, 'Terms'), terms)].filter(Boolean));
  return { h1, band, short, secs, terms };
}

function drawSection(key) {
  if (!els || !current) return;
  const B = els.secs[key];
  const r = renderBlock(key, current, res[key], { slow: slow[key] });
  if (r.outcome) outcome[key] = r.outcome;
  B.el.classList.remove('blk-stale', 'blk-old', 'blk-missing');
  if (r.mark) B.el.classList.add(`blk-${r.mark}`);
  let body = r.body;
  // Values in words and tables when the file was read and matched; otherwise the shared
  // renderer's own message (loading, slow, missing, shape changed, no match, islands).
  if (LP[key] && res[key]?.latest?.ok && r.outcome && r.outcome.how !== SHAPE && !/^no /.test(r.outcome.how)) {
    let own = null;
    try { own = LP[key](current, res[key].latest.data); } catch { own = null; }
    if (own) body = [...r.body.filter(n => n.matches?.('p.status.warn')), ...own];
  }
  B.body.replaceChildren(...body);
  B.prov.replaceChildren(r.prov);
}

function drawBand() {
  if (!els) return;
  els.band.replaceChildren(statusBand(SOURCES.map(S => ({ id: S.id, name: S.name, href: `#h-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' }).el);
}

function finish() {
  if (!els || !current) return;
  els.short.replaceChildren(...summaryClauses(outcome, res).map(c => h('p', {}, c)));
  els.terms.replaceChildren(termsBlock(SOURCES.map(S => res[S.key] || { id: S.id })));
}

function show(p, { focus = false, msg = null } = {}) {
  current = p;
  for (const k of Object.keys(outcome)) delete outcome[k];
  els = build(p, msg);
  for (const S of SOURCES) drawSection(S.key);
  drawBand();
  document.title = `${p.name}, ${NAME} design | Weather, from our data`;
  if (mainLink) mainLink.href = `/place/?id=${p.id}`;
  keepTown(p);
  if (focus) els.h1.focus();
  const me = p;
  for (const S of SOURCES) loads[S.key].then(() => { if (current === me) { drawSection(S.key); drawBand(); } });
  Promise.all(SOURCES.map(S => loads[S.key])).then(() => { if (current === me) finish(); });
}

function fromURL({ focus = false } = {}) {
  const { places, unknown } = placesFromURL(location.search);
  show(places[0], { focus, msg: unknown.length ? `No town has the id ${unknown[0].slice(0, 20)}; showing ${places[0].name}.` : null });
}
addEventListener('popstate', () => fromURL({ focus: true }));
fromURL();
