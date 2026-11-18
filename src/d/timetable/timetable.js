// timetable.js: the Timetable design, /d/timetable/?id=<globalIdLocal>. Every source for one town
// on one five-day axis (today and the next four Lisbon calendar days), with a "now" line and each
// file's read time, so what is in force, what comes next and how old each file is share one picture.
// At 760 px and wider a table; below, one section per day, with the source lines in a list after the
// days (decision D3). Both views are drawn from one model built once per town and redraw, so they
// cannot disagree. Every figure comes from the six latest.json files as read; nothing is guessed.
// ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance D), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md sections 2 and 4 and the conductor's decisions (team/rounds/2.md).

import { h, s, provLine, statusBand, termsBlock, sourceState, fmtDay } from '/assets/js/data.js';
import { RCM_LEVELS, WEATHER_TYPES, uvBand } from '/assets/js/codes.js';
import { areaOf, findForecast, findSea, findUV, findFireRisk, findStation, dicoOf, SEA_NEAR_KM } from '/assets/js/places.js';
import { swatch, levelWord, ensureHatches, lisbonNow, addDays, areaName } from '/assets/js/map.js';
import { SOURCES, BY_KEY, loadSix, renderBlock, liveSpells, forecastScale, uvTile, rcmTile, placesFromURL, townSelect, setTown, keepTown } from '/assets/js/place-blocks.js';

const NAME = 'Timetable';
const ROWS = ['warnings', 'forecasts', 'sea', 'uv', 'fire', 'observations']; // the proposal's row order
const LABEL = { warnings: 'Warnings', forecasts: 'Forecast', sea: 'Sea', uv: 'UV index', fire: 'Fire risk', observations: 'Station' };
const DAY_MIN = 1440;
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const wide = matchMedia('(min-width: 760px)');
const vh = t => h('span', { class: 'pc-vh' }, t);
const none = (t = 'no value') => h('span', { class: 'tt-none' }, t);
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
// Minutes since midnight of a Portugal-time string "YYYY-MM-DDTHH:MM".
const mins = t => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const { res, slow, loads } = loadSix({ onSlow: () => draw() });
const root = document.getElementById('d-root');
let place = null, unknownMsg = '', els = null;

// ---------- the model: one object per town and redraw ----------
// rows[key]: { state (renderBlock's level), mark, fail: Node[] | null (loading, missing or shape
// changed: drawn across the five days), notes: string[], cells: [() => Node[]] x 5 | null,
// span: { from, make } | null (one sentence across some days), sub: [...] for warnings }
function buildModel(p) {
  const now = lisbonNow();
  const t0 = now.slice(0, 10);
  const days = [0, 1, 2, 3, 4].map(i => addDays(t0, i));
  const rows = {};
  for (const key of ROWS) {
    const R = renderBlock(key, p, res[key], { slow: slow[key] });
    const row = { key, R, state: R.level, mark: R.mark, fail: null, notes: [], cells: null, span: null, sub: null, read: readInfo(res[key], t0) };
    const shapeChanged = R.outcome && R.outcome.how === "the file's shape has changed";
    if (!res[key] || R.level === 'missing' || shapeChanged) row.fail = R.body;
    else if (key === 'fire' && !dicoOf(p)) row.span = { from: 0, make: () => ['No fire risk class for the islands: IPMA publishes none for Madeira or the Azores.'], short: 'no fire risk class for the islands' };
    else {
      try { FILL[key](row, p, res[key].latest.data, days, now); } catch (e) { row.fail = R.body.length ? [h('p', { class: 'status warn' }, `The ${LABEL[key].toLowerCase()} file was read but its shape has changed, so this row cannot be drawn. Nothing is shown in its place.`)] : R.body; }
    }
    rows[key] = row;
  }
  return { p, now, days, nowMin: mins(now), rows };
}

// When the file was read, on the Portugal clock, for the tick and the label.
function readInfo(src, t0) {
  const st = sourceState(src || null);
  if (!st.readAt) return { st, inAxis: false, before: false };
  const local = lisbonNow(new Date(st.readAt));
  return { st, local, inAxis: local.slice(0, 10) === t0, before: local.slice(0, 10) < t0, min: mins(local) };
}

const FILL = {
  warnings(row, p, L, days, now) {
    if (!Array.isArray(L.active)) throw new Error('shape');
    const { live } = liveSpells(p, L, now);
    const end = addDays(days[4], 1) + 'T00:00';
    const types = [...new Set(live.map(w => w.type || w.type_pt || 'type not given'))];
    const beyond = live.filter(w => w.start >= end).length;
    if (beyond) row.notes.push(`${beyond} later spell${beyond === 1 ? '' : 's'} begin${beyond === 1 ? 's' : ''} after these five days.`);
    if (!live.length) {
      row.span = { from: 0, make: () => [`No yellow, orange or red warning for the ${areaName(p.area)} area in IPMA's file.`], short: 'no warning in IPMA\'s file' };
      return;
    }
    // Each spell cut into the day cells it covers; start and end compared as Portugal-time strings.
    const segs = (ty, d) => {
      const a = d + 'T00:00', b = addDays(d, 1) + 'T00:00';
      return live.filter(w => (w.type || w.type_pt || 'type not given') === ty && w.start < b && w.end > a).map(w => {
        const from = w.start > a ? mins(w.start) : 0, to = w.end < b ? mins(w.end) : DAY_MIN;
        const when = from === 0 && to === DAY_MIN ? 'all day' : from === 0 ? `until ${hhmm(to)}` : to === DAY_MIN ? `from ${hhmm(from)}` : `${hhmm(from)} to ${hhmm(to)}`;
        return { w, from, to, text: `${levelWord(w.level)}, ${ty}, ${when}` };
      });
    };
    row.sub = types.map(ty => ({ type: ty, segs: days.map(d => segs(ty, d)) }));
    row.byDay = days.map((d, i) => row.sub.flatMap(x => x.segs[i]));
    row.notes.push('Times: Portugal time, as IPMA gives them.');
  },
  forecasts(row, p, L, days) {
    if (!Array.isArray(L.cities)) throw new Error('shape');
    const c = findForecast(p, L);
    if (!c) { row.span = { from: 0, make: () => [`IPMA's forecast file has no entry for ${p.name} (id ${p.id}).`], short: 'no entry for this town' }; return; }
    const sc = forecastScale(L);
    const upd = c.updated ? Date.parse(/Z$/.test(c.updated) ? c.updated : c.updated + 'Z') : NaN;
    if (Number.isFinite(upd) && Date.now() - upd > 14 * 3600000) row.notes.push(`IPMA's run is ${Math.round((Date.now() - upd) / 3600000)} h old; a newer forecast may exist.`);
    if (sc) row.notes.push(`Bars on one scale for all ${(L.cities || []).length} places, ${sc.lo} to ${sc.hi} °C.`);
    row.cells = days.map(d => () => {
      const x = (c.days || []).find(y => y.date === d);
      if (!x) return [none()];
      const ok = isNum(x.t_min_c) && isNum(x.t_max_c);
      const wx = x.weather_type > 0 ? WEATHER_TYPES[x.weather_type] : null;
      return [h('span', { class: 'tt-fig' }, ok ? `${x.t_min_c} to ${x.t_max_c} °C` : 'temperature not given'),
        ok && sc ? h('span', { class: 'pc-bar tt-range', 'aria-hidden': 'true' }, h('i', { style: `left:${sc.pct(x.t_min_c)}%;width:${Math.max(sc.pct(x.t_max_c) - sc.pct(x.t_min_c), 1.5)}%` })) : null,
        h('span', { class: 'tt-sub' }, isNum(x.rain_prob_pct) ? `rain ${x.rain_prob_pct}%` : 'chance of rain not given'),
        h('span', { class: 'tt-sub' }, wx || 'weather not given')];
    });
  },
  sea(row, p, L, days) {
    if (!Array.isArray(L.coasts)) throw new Error('shape');
    const f = findSea(p, L);
    if (!f) { row.span = { from: 0, make: () => ['No coastal point in the file has a position.'], short: 'no coastal point' }; return; }
    if (!f.near) {
      row.span = { from: 0, make: () => [`No sea point within ${SEA_NEAR_KM} km (this site's choice). Nearest: ${f.coast.name}, ${f.km} km.`], short: `no sea point within ${SEA_NEAR_KM} km` };
      return;
    }
    row.notes.push(`${f.coast.name}, ${f.km} km away.`);
    const rng = (a, b) => isNum(a) && isNum(b) ? (a === b ? `${a} m` : `${a} to ${b} m`) : null;
    row.cells = days.map(d => () => {
      const x = (f.coast.days || []).find(y => y.date === d);
      const r = x && rng(x.sea_min_m, x.sea_max_m);
      return r ? [h('span', { class: 'tt-fig' }, `total sea ${r}`)] : [none()];
    });
  },
  uv(row, p, L, days) {
    if (!Array.isArray(L.places)) throw new Error('shape');
    const f = findUV(p, L);
    if (!f) { row.span = { from: 0, make: () => [`IPMA's UV file has no value for ${p.name} or any town near it.`], short: 'no UV value' }; return; }
    if (!f.exact) row.notes.push(`For ${f.place.name}, ${f.km} km away: IPMA gives no UV for ${p.name}.`);
    row.cells = days.map(d => () => {
      const vals = (f.uv.days || []).filter(x => x.date === d).map(x => x.index);
      if (!vals.length) return [none()];
      return vals.flatMap((v, i) => { const b = uvBand(v); return [i ? ' ' : null, h('span', { class: 'tt-uvv' }, uvTile(v), ' ', h('span', { class: 'tt-sub', 'aria-hidden': 'true' }, b ? b.name : 'no band'))]; });
    });
  },
  fire(row, p, L, days) {
    if (!Array.isArray(L.municipalities)) throw new Error('shape');
    const f = findFireRisk(p, L);
    if (!f) { row.span = { from: 0, make: () => ['No municipality in the file could be matched to this town.'], short: 'no municipality matched' }; return; }
    if (!f.exact) row.notes.push(`Nearest municipality point, ${f.km} km away.`);
    row.cells = days.map(d => () => {
      const x = (f.municipality.days || []).find(y => y.date === d);
      if (!x || !RCM_LEVELS[x.rcm]) return [none()];
      return [rcmTile(x.rcm), h('span', { class: 'tt-fig' }, `Class ${x.rcm}, ${RCM_LEVELS[x.rcm].name.toLowerCase()}`)];
    });
  },
  observations(row, p, L) {
    if (!Array.isArray(L.stations)) throw new Error('shape');
    const f = findStation(p, L);
    if (!f) { row.span = { from: 0, make: () => ['No station in the file has a position.'], short: 'no station' }; return; }
    const hour = L.hour_utc ? L.hour_utc.slice(11, 16) : null;
    const lag = L.hour_utc && L.read_at ? (Date.parse(L.read_at) - Date.parse(L.hour_utc)) / 3600000 : null;
    if (lag !== null && lag > 3) row.notes.push(`These readings are for ${hour} UTC, ${Math.round(lag)} h before the read.`);
    const n = f.nearest, r = f.reporting;
    const one = st => `${hour || 'unknown hour'} UTC: ${isNum(st.station.reading?.temp_c) ? st.station.reading.temp_c + ' °C' : 'no temperature'}, ${st.station.name}, ${st.km} km`;
    row.today = () => n.station.reading ? [h('span', { class: 'tt-fig' }, one(n))]
      : r ? [h('span', { class: 'tt-fig' }, one(r)), h('span', { class: 'tt-sub' }, `The nearest, ${n.station.name} (${n.km} km), sent nothing.`)]
        : [h('span', { class: 'tt-sub' }, `No station sent a reading for ${hour || 'this hour'} UTC. The nearest is ${n.station.name}, ${n.km} km.`)];
    row.span = { from: 1, make: () => ['Stations report the latest hour only.'], short: 'stations report the latest hour only' };
  },
};

// ---------- drawing ----------
function rowLabel(row, { id } = {}) {
  const S = BY_KEY[row.key], ri = row.read;
  const st = ri.st;
  let read;
  if (row.state === 'reading' || row.state === 'slow') read = st.word;
  else if (row.state === 'missing') read = 'not read';
  else if (!st.readAt) read = 'read time unknown';
  else if (ri.before) read = `read before today: ${st.ago}`;
  else {
    // UTC, as the provLine under the row says it (review S3).
    const d = new Date(st.readAt);
    read = Number.isNaN(d.getTime()) ? `read ${ri.local.slice(11, 16)} Portugal time, ${st.ago}` : `read ${d.toISOString().slice(11, 16)} UTC, ${st.ago}`;
  }
  return [h('a', { href: S.href, class: 'tt-name' }, LABEL[row.key]),
    h('span', { class: 'tt-read' }, read),
    ['stale', 'old', 'unknown'].includes(row.state) ? h('strong', { class: `tt-state pl-${row.state}` }, st.word) : null,
    ...row.notes.map(n => h('span', { class: 'tt-note' }, n))];
}

function warnBar(segs) {
  ensureHatches();
  const HATCH = { yellow: ['ipma-hy'], orange: ['ipma-ho1', 'ipma-ho2'], red: ['ipma-hr1', 'ipma-hr2'] };
  const svg = s('svg', { class: 'tt-bar', width: '100%', height: 10, 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { x: 0, y: 4, width: '100%', height: 2, class: 'tt-track' }));
  for (const g of segs) {
    const x = `${(g.from / DAY_MIN) * 100}%`, w = `${Math.max(((g.to - g.from) / DAY_MIN) * 100, 1)}%`;
    svg.append(s('rect', { x, y: 0, width: w, height: 10, style: `fill:var(--w-${g.w.level})` }));
    for (const id of HATCH[g.w.level] || []) svg.append(s('rect', { x, y: 0, width: w, height: 10, style: `fill:url(#${id})` }));
    svg.append(s('rect', { x, y: 0.5, width: w, height: 9, class: 'tt-edge' }));
  }
  return svg;
}

function table(m) {
  const { days, rows } = m;
  const head = h('tr', {}, h('th', { scope: 'col', class: 'tt-corner' }, 'Source'), days.map((d, i) => h('th', { scope: 'col', class: i === 0 ? 'tt-today' : null },
    i === 0 ? `Today, ${fmtDay(d)}` : fmtDay(d), i === 0 ? h('span', { class: 'tt-nowlab' }, `now, ${m.now.slice(11, 16)} Portugal time`) : null)));
  const body = [];
  const todayCell = (kids, row, extra = {}) => {
    const td = h('td', { class: 'tt-today', ...extra }, kids);
    if (row && row.read.inAxis) td.append(h('span', { class: `tt-tick tt-tick-${row.state}`, style: `left:${(row.read.min / DAY_MIN) * 100}%`, title: `${LABEL[row.key]} file read at ${row.read.local.slice(11, 16)} Portugal time`, 'aria-hidden': 'true' }));
    return td;
  };
  for (const key of ROWS) {
    const row = rows[key];
    const cls = `tt-row tt-r-${key}${row.mark ? ` tt-mark-${row.mark}` : ''}`;
    const th = h('th', { scope: 'row', id: `tt-row-${key}`, rowspan: row.sub ? String(row.sub.length) : null }, rowLabel(row));
    if (row.fail) body.push(h('tr', { class: cls }, th, h('td', { colspan: '5', class: 'tt-span' }, row.fail)));
    else if (row.sub) {
      row.sub.forEach((sb, j) => body.push(h('tr', { class: cls }, j === 0 ? th : null,
        sb.segs.map((segs, i) => {
          const kids = segs.length ? [warnBar(segs), ...segs.map(g => h('span', { class: 'tt-wtext' }, swatch(g.w.level), ' ', g.text))] : [none('no warning')];
          return i === 0 ? todayCell(kids, j === 0 ? row : null) : h('td', {}, kids);
        }))));
    } else if (row.span && row.span.from === 0) body.push(h('tr', { class: cls }, th, h('td', { colspan: '5', class: 'tt-span tt-today-span' }, row.span.make())));
    else if (row.today) body.push(h('tr', { class: cls }, th, todayCell(row.today(), row), h('td', { colspan: '4', class: 'tt-span tt-muted' }, row.span.make())));
    else body.push(h('tr', { class: cls }, th, row.cells.map((c, i) => i === 0 ? todayCell(c(), row) : h('td', {}, c()))));
    body.push(h('tr', { class: 'tt-provrow' }, h('td', { colspan: '6' }, row.R.prov)));
  }
  const t = h('table', { class: 'tt-table', style: `--now:${(m.nowMin / DAY_MIN) * 100}%` },
    h('caption', {}, `${m.p.name}: every source on one five-day axis. The solid tick at the top of Today marks now; a dotted tick marks when each file was read.`),
    h('colgroup', {}, h('col', { class: 'tt-c0' }), days.map(() => h('col'))),
    h('thead', {}, head), h('tbody', {}, body));
  return h('div', { class: 'tt-wide' }, t);
}

function daySections(m) {
  const { days, rows } = m;
  const link = key => h('a', { href: `#tt-src-${key}`, class: 'tt-name' }, LABEL[key]);
  const secs = days.map((d, i) => {
    const items = [];
    for (const key of ROWS) {
      const row = rows[key];
      if (key === 'observations' && i > 0) continue; // the station reading belongs to Today only
      let kids;
      if (row.fail) kids = i === 0 ? row.fail.map(n => n.cloneNode(true)) : [none(row.state === 'missing' ? 'not read: see the sources below' : row.state === 'reading' || row.state === 'slow' ? 'still reading' : 'no value: see Today')];
      else if (row.byDay) kids = row.byDay[i].length ? row.byDay[i].map(g => h('span', { class: 'tt-wtext' }, swatch(g.w.level), ' ', g.text)) : [none('no yellow, orange or red warning')];
      else if (row.today && i === 0) kids = row.today();
      else if (row.span) kids = i === 0 ? row.span.make() : [none(`no value: ${row.span.short}`)];
      else kids = row.cells[i]();
      // A stale or old file is said in words at the item, not by the coloured rule alone (review S1).
      const word = ['stale', 'old'].includes(row.mark) ? [' (', h('strong', { class: `tt-iword pl-${row.mark}` }, row.mark), ')'] : [];
      items.push(h('li', { class: `tt-item${row.mark ? ` tt-mark-${row.mark}` : ''}` }, link(key), ...word, ': ', h('span', { class: 'tt-val' }, kids)));
    }
    return h('section', { class: 'tt-day', 'aria-labelledby': `tt-d${i}` },
      h('h2', { id: `tt-d${i}` }, i === 0 ? `Today, ${fmtDay(d)}` : fmtDay(d), i === 0 ? h('span', { class: 'tt-nowlab' }, ` · now ${m.now.slice(11, 16)} Portugal time`) : null),
      h('ul', { class: 'tt-list' }, items));
  });
  return h('div', { class: 'tt-narrow' }, secs);
}

function sourcesList(m) {
  return h('section', { class: 'tt-sources', 'aria-labelledby': 'tt-src-h' },
    h('h2', { id: 'tt-src-h' }, 'Sources and read times'),
    h('ul', {}, ROWS.map(key => {
      const row = m.rows[key];
      return h('li', { id: `tt-src-${key}`, tabindex: '-1', class: row.mark ? `tt-mark-${row.mark}` : null },
        h('p', { class: 'tt-srclab' }, rowLabel(row)), provLine(res[key] || { id: BY_KEY[key].id }, { slow: slow[key] }));
    })));
}

function frame(p) {
  const area = areaOf(p);
  const h1 = h('h1', { id: 'tt-h1', tabindex: '-1' }, p.name);
  const sel = townSelect({ id: 'tt-town', selected: p.id });
  const form = h('form', { class: 'tt-pick', action: '/d/timetable/', method: 'get', onsubmit: e => {
    e.preventDefault();
    const q = placesFromURL(`?id=${sel.value}`, { fallback: [1110600] }).places[0];
    if (!q || q === place) return;
    setTown([q.id]); show(q, '', { focus: true });
  } }, h('label', { for: 'tt-town' }, 'Another town'), sel, h('button', { type: 'submit' }, 'Show'));
  const band = h('div', { class: 'tt-band' });
  const body = h('div', { class: 'tt-body' });
  const terms = h('div', { class: 'terms-body' });
  root.replaceChildren(
    unknownMsg ? h('p', { class: 'status warn', role: 'note' }, unknownMsg) : '',
    h('header', { class: 'tt-head' }, h1, h('p', { class: 'tt-subhead' }, `Warning area ${area?.name || p.area} (${p.area}) · forecast place ${p.id} · the next five days, Portugal calendar`), form),
    band, body,
    h('section', { class: 'tt-terms', 'aria-labelledby': 'terms' }, h('h2', { id: 'terms', tabindex: '-1' }, 'Terms'), terms));
  return { h1, band, body, terms };
}

function draw() {
  if (!place || !els) return;
  const m = buildModel(place);
  const { el } = statusBand(SOURCES.map(S => ({ id: S.id, name: LABEL[S.key], href: wide.matches ? `#tt-row-${S.key}` : `#tt-src-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' });
  els.band.replaceChildren(el);
  els.body.replaceChildren(table(m), daySections(m), sourcesList(m));
  els.terms.replaceChildren(termsBlock(SOURCES.map(S => res[S.key] || { id: S.id })));
}

function show(p, msg, { focus = false } = {}) {
  place = p; unknownMsg = msg;
  els = frame(p);
  document.title = `${p.name}, ${NAME} design | Weather, from our data`;
  const main = document.getElementById('d-main'); if (main) main.href = `/place/?id=${p.id}`;
  keepTown(p);
  draw();
  if (focus) els.h1.focus();
}

function fromURL(opts) {
  const q = placesFromURL(location.search, { fallback: [1110600] });
  const raw = q.unknown[0];
  show(q.places[0], raw !== undefined ? `No town has the id ${String(raw).slice(0, 20)}; showing ${q.places[0].name}.` : '', opts);
}

for (const S of SOURCES) loads[S.key].then(() => draw());
wide.addEventListener('change', () => draw());
addEventListener('popstate', () => fromURL({ focus: true }));
// Redraw once a minute so the now line and the ages move on.
setInterval(draw, 60000);
fromURL();
