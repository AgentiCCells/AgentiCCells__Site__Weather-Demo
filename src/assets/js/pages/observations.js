// observations.js: the Stations page. Stations on the hex map coloured by temperature (hollow rings
// for no reading, counted), wind arrows, a sortable table, the hour (UTC), how many stations
// reported, provenance and the run strip. Read live from data.promptugal.news; nothing is guessed
// or interpolated. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance A), 2026-11-18, round 1.
// Adapted from AgentiCCells/AgentiCCells__Site__IPMA-Data, src/assets/js/pages/observations.js (commit
// 44ed7f8), Apache-2.0, same organisation, by developer.weather-demo@AgentiCCells.dinis (instance B),
// 2026-11-18, round 1: a "Nearest to" column names the towns of PLACES whose nearest station this is
// (places.js findStation), each linking to /place/?id=<globalIdLocal> (design proposal 3.3).

import { loadSource, ageBanner, provenance, loading, failure, runStrip, fmtUTC, ageMinutes, h, s } from '../data.js';
import { WIND_DIR_ID } from '../codes.js';
import { buildGrid, pointMap } from '../map.js';
import { PLACES, findStation } from '../places.js';

// The folding styles live in charts.css (proposal 11), which this page's HTML does not link: add it once.
if (!document.querySelector('link[href="/assets/charts.css"]')) document.head.append(h('link', { rel: 'stylesheet', href: '/assets/charts.css' }));

const IPMA_OBS = 'https://www.ipma.pt/en/otempo/obs.superficie/';
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const R = p => p.reading || null;

// Temperature bins: the smallest step of 1 to 5 degrees that gives 6 bins or fewer over this hour's range.
function bins(vals) {
  const mn = Math.min(...vals), mx = Math.max(...vals);
  for (const step of [1, 2, 3, 4, 5, 10]) {
    const lo = Math.floor(mn / step) * step; let hi = Math.ceil(mx / step) * step; if (hi === lo) hi = lo + step;
    const n = Math.round((hi - lo) / step);
    if (n <= 6) return { lo, hi, step, n, bin: t => Math.min(n - 1, Math.floor((t - lo) / step)) };
  }
}
// Wind speed bins for the arrow's weight.
const SPEED = [[0, 15, 'under 15 km/h', 0.9], [15, 30, '15 to 30 km/h', 1.8], [30, Infinity, '30 km/h or more', 2.8]];

function drawMap(holder, legend, O, G, measure) {
  const st = O.stations || [];
  if (measure === 'temp') {
    const has = p => isNum(R(p)?.temp_c);
    const vals = st.filter(has).map(p => R(p).temp_c);
    const B = vals.length ? bins(vals) : null;
    const pts = [...st.filter(p => !has(p)), ...st.filter(has)];
    pointMap(holder, G, pts, {
      label: `Map of ${st.length} IPMA stations. ${vals.length} reported a temperature for ${fmtUTC(O.hour_utc)}${vals.length ? `, from ${Math.min(...vals)} to ${Math.max(...vals)} °C` : ''}; ${st.length - vals.length} did not. The table below lists every station.`,
      mark: (x, y, p) => {
        const ok = has(p) && B;
        const c = ok ? s('circle', { cx: x, cy: y, r: 4.2, class: 'stn', style: `fill:var(--t-${B.bin(R(p).temp_c) + 1})`, 'stroke-width': 0.9 })
          : s('circle', { cx: x, cy: y, r: 2.2, class: 'ring', 'stroke-width': 0.9 });
        c.append(s('title', {}, ok ? `${p.name}: ${R(p).temp_c} °C` : `${p.name}: no temperature this hour`)); return c;
      },
    });
    legend.replaceChildren(...(B ? [...Array(B.n).keys()].map(i => h('li', {}, h('span', { class: 'sw dot-sw', style: `background:var(--t-${i + 1})` }), `${B.lo + i * B.step} to ${B.lo + (i + 1) * B.step} °C`)) : []),
      h('li', {}, h('span', { class: 'sw ring-sw' }), `no temperature (${st.length - vals.length} stations)`));
    return `Dots: temperature in bins of ${B ? B.step : '?'} °C over this hour's range, from IPMA's hourly mean at 1.5 m.`;
  }
  // Wind: an arrow per station pointing where the wind goes (IPMA gives where it comes from).
  const dirOf = p => R(p)?.wind_dir_id;
  const kind = p => { const d = dirOf(p); if (!R(p) || d === null || d === undefined || !(d in WIND_DIR_ID)) return 'none'; return d === 0 ? 'calm' : 'dir'; };
  const counts = { none: 0, calm: 0, dir: 0 }; st.forEach(p => counts[kind(p)]++);
  const pts = [...st.filter(p => kind(p) === 'none'), ...st.filter(p => kind(p) === 'calm'), ...st.filter(p => kind(p) === 'dir')];
  pointMap(holder, G, pts, {
    label: `Map of wind at ${st.length} IPMA stations for ${fmtUTC(O.hour_utc)}: ${counts.dir} with a direction, ${counts.calm} with no direction, ${counts.none} with no wind reading. The table below lists every station.`,
    mark: (x, y, p) => {
      const k = kind(p); let el;
      if (k === 'none') el = s('circle', { cx: x, cy: y, r: 2.2, class: 'ring', 'stroke-width': 0.9 });
      else if (k === 'calm') el = s('circle', { cx: x, cy: y, r: 2.4, class: 'calm', 'stroke-width': 1 });
      else {
        const from = (dirOf(p) % 8 === 1 ? 0 : (dirOf(p) - 1) * 45), to = (from + 180) * Math.PI / 180;
        const dx = Math.sin(to), dy = -Math.cos(to), L = 6;
        const sp = R(p).wind_kmh; const wgt = isNum(sp) ? SPEED.find(b => sp >= b[0] && sp < b[1])[3] : 0.6;
        const tx = x + dx * L, ty = y + dy * L, hx = -dy, hy = dx;
        el = s('g', { class: 'arrow' }, s('line', { x1: x - dx * L, y1: y - dy * L, x2: tx - dx * 2, y2: ty - dy * 2, 'stroke-width': wgt, 'stroke-linecap': 'round' }),
          s('path', { d: `M${tx.toFixed(2)},${ty.toFixed(2)}L${(tx - dx * 4 + hx * 2.4).toFixed(2)},${(ty - dy * 4 + hy * 2.4).toFixed(2)}L${(tx - dx * 4 - hx * 2.4).toFixed(2)},${(ty - dy * 4 - hy * 2.4).toFixed(2)}Z`, stroke: 'none' }));
      }
      const r = R(p);
      el.append(s('title', {}, k === 'none' ? `${p.name}: no wind reading this hour` : k === 'calm' ? `${p.name}: no direction (calm or none)${isNum(r.wind_kmh) ? `, ${r.wind_kmh} km/h` : ''}`
        : `${p.name}: from ${WIND_DIR_ID[dirOf(p)]}${isNum(r.wind_kmh) ? `, ${r.wind_kmh} km/h` : ', speed not given'}`));
      return el;
    },
  });
  const arrow = w => s('svg', { class: 'sw', viewBox: '0 0 22 16', 'aria-hidden': 'true', style: 'border:0' }, s('line', { x1: 3, y1: 8, x2: 15, y2: 8, style: 'stroke:var(--ink)', 'stroke-width': w * 1.4 }), s('path', { d: 'M20,8L14,4.5L14,11.5Z', style: 'fill:var(--ink)' }));
  legend.replaceChildren(...SPEED.map(b => h('li', {}, arrow(b[3]), b[2])), h('li', {}, arrow(0.6), 'speed not given'),
    h('li', {}, h('span', { class: 'sw ring-sw', style: 'border-color:var(--ink)' }), `no direction (${counts.calm})`), h('li', {}, h('span', { class: 'sw ring-sw' }), `no wind reading (${counts.none})`));
  return "Arrows point where the wind is going (IPMA gives the direction it comes from, in eight points), at 10 m. IPMA's direction 0 means no direction, not north.";
}

// ---------- the sortable table ----------
const COLS = [
  ['Station', p => p.name ?? null, 'text'],
  ['Temperature (°C)', p => R(p)?.temp_c, 'num', 1],
  ['Humidity (%)', p => R(p)?.humidity_pct, 'num', 0],
  ['Wind (km/h)', p => R(p)?.wind_kmh, 'num', 1],
  ['Wind from', p => { const d = R(p)?.wind_dir_id; return d === 0 ? 'no direction' : (WIND_DIR_ID[d] ?? null); }, 'text'],
  ['Rain (mm)', p => R(p)?.rain_mm, 'num', 1],
  ['Pressure (hPa)', p => R(p)?.pressure_hpa, 'num', 1],
  ['Radiation (kJ/m²)', p => R(p)?.radiation_kj_m2, 'num', 1],
];
// For each station, the towns whose nearest station it is, and the towns that use it as their nearest
// reporting station because their nearest sent nothing this hour. Keyed by the station object.
function townsByStation(O) {
  const by = new Map();
  const put = (st, entry) => { if (!by.has(st)) by.set(st, []); by.get(st).push(entry); };
  for (const p of PLACES) {
    const f = findStation(p, O);
    if (!f) continue;
    put(f.nearest.station, { p, km: f.nearest.km, reporting: false });
    if (f.reporting && f.reporting.station !== f.nearest.station) put(f.reporting.station, { p, km: f.reporting.km, reporting: true });
  }
  return by;
}
const kmText = km => `${km} km`;
function nearCell(list) {
  if (!list?.length) return h('td', { class: 'none' }, 'none');
  return h('td', {}, list.flatMap((t, i) => [i ? ', ' : '', h('a', { href: `/place/?id=${t.p.id}` }, t.p.name),
    h('span', { class: 'muted' }, ` (${kmText(t.km)}${t.reporting ? ', nearest reporting' : ''})`)]));
}

// Round 2 (team/rounds/2/design/PROPOSAL.md section 11.1, decision D6), developer.weather-demo@ (instance D):
// stations that sent nothing leave the table at every width and are listed by name in a fold under it;
// below 600 px the table starts with four columns (class c-opt hides the rest) and the first 20 rows
// (class c-more), with a button above and one below to show the rest. Sorting is unchanged.
const OPT = new Set([2, 4, 6, 7, 8]); // Humidity, Wind from, Pressure, Radiation, Nearest to
const FIRST = 20;
const silent = p => !p.reading || COLS.slice(1, 8).every(([, get, type]) => { const v = get(p); return v === null || v === undefined || (type === 'num' && !isNum(v)); });

function sortableTable(stations, caption, near = new Map()) {
  COLS.push(['Nearest to', p => (near.get(p) || []).map(t => t.p.name).join(', ') || null, 'text']);
  let col = 0, dir = 1;
  const tbody = h('tbody');
  const wrap = h('div', { class: 'table-wrap obs-wrap' });
  const ths = COLS.map(([name, , type], i) => h('th', { scope: 'col', class: `sortable${type === 'num' ? ' num' : ''}${OPT.has(i) ? ' c-opt' : ''}` },
    h('button', { type: 'button', onclick: () => { if (col === i) dir = -dir; else { col = i; dir = type === 'num' ? -1 : 1; } render(); } }, name)));
  const render = () => {
    const [, get, type] = COLS[col];
    const rows = stations.slice().sort((a, b) => {
      const x = get(a), y = get(b); const xm = x === null || x === undefined || (type === 'num' && !isNum(x)), ym = y === null || y === undefined || (type === 'num' && !isNum(y));
      if (xm || ym) return xm - ym || String(a.name).localeCompare(String(b.name), 'pt');
      return (type === 'num' ? x - y : String(x).localeCompare(String(y), 'pt')) * dir || String(a.name).localeCompare(String(b.name), 'pt');
    });
    ths.forEach((th, i) => { if (i === col) th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort'); });
    tbody.replaceChildren(...rows.map((p, r) => h('tr', { class: r >= FIRST ? 'c-more' : null }, COLS.map(([, get, type, dg], i) => {
      const v = get(p);
      const opt = OPT.has(i) ? 'c-opt' : '';
      if (i === 0) return h('th', { scope: 'row', tabindex: r === FIRST ? '-1' : null }, v ?? 'unnamed');
      if (i === COLS.length - 1) { const c = nearCell(near.get(p)); c.classList.add('c-opt'); return c; }
      if (v === null || v === undefined || (type === 'num' && !isNum(v))) return h('td', { class: `none${type === 'num' ? ' num' : ''} ${opt}`.trim() }, 'none');
      return h('td', { class: `${type === 'num' ? 'num' : ''} ${opt}`.trim() || null }, type === 'num' ? Number(v).toFixed(dg) : v);
    }))));
  };
  render();
  // The label says what the button will do, so it carries no aria-pressed (review S4).
  const colsBtn = h('button', { type: 'button', class: 'cb-btn obs-cols', onclick: () => {
    const on = !wrap.classList.contains('all-cols');
    wrap.classList.toggle('all-cols', on);
    colsBtn.textContent = on ? 'Show 4 columns' : `Show all ${COLS.length} columns`;
  } }, `Show all ${COLS.length} columns`);
  const more = stations.length - FIRST;
  const rowsBtn = more > 0 ? h('button', { type: 'button', class: 'cb-btn obs-rows', onclick: () => {
    wrap.classList.add('all-rows');
    rowsBtn.hidden = true;
    tbody.querySelector('th[tabindex="-1"]')?.focus();
  } }, `Show the other ${more} station${more === 1 ? '' : 's'}`) : null;
  wrap.append(h('table', { class: 'obs-table' }, h('caption', {}, caption), h('thead', {}, h('tr', {}, ths)), tbody));
  return h('div', {}, h('p', { class: 'obs-ctl' }, colsBtn), wrap, rowsBtn ? h('p', { class: 'obs-ctl' }, rowsBtn) : null);
}

// The silent stations, by name, each with the towns it is nearest to.
function silentFold(list, hour, near) {
  if (!list.length) return null;
  const names = list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt')).flatMap((p, i) => {
    const towns = near.get(p) || [];
    // h() flattens one level only, so every item here must be a node or a string (no nested arrays).
    const links = towns.flatMap((t, k) => [k ? ', ' : '', h('a', { href: `/place/?id=${t.p.id}` }, t.p.name)]);
    return [i ? ', ' : '', p.name ?? 'unnamed', ...(towns.length ? [' (nearest to ', ...links, ')'] : [])];
  });
  return h('details', { class: 'fold obs-silent' }, h('summary', {}, `${list.length} station${list.length === 1 ? '' : 's'} sent nothing for ${hour}`),
    h('p', {}, names, '.'));
}

async function main() {
  const el = document.getElementById('obs'), tb = document.getElementById('table'), runs = document.getElementById('runs');
  const slow = loading(el, "IPMA's station readings"), slowT = loading(tb, "IPMA's station readings"), slowR = loading(runs, "the collector's log");
  const [src, F] = await Promise.all([loadSource('ipma-observations', { reads: true, onSlow: () => { slow(); slowT(); slowR(); } }), loadSource('ipma-fire-risk')]);
  runs.replaceChildren(h('div', { class: 'panel' }, runStrip(src.reads)));
  if (!src.latest.ok) { failure(el, "IPMA's station readings", src.latest, IPMA_OBS); failure(tb, "IPMA's station readings", src.latest, IPMA_OBS); return; }
  const O = src.latest.data;
  // The stale or old line above the chart (data.js ageBanner), as on every data page.
  const age = ageBanner(src.latest, { subject: "These stations' figures", page: IPMA_OBS });
  const st = (O.stations || []).filter(p => isNum(p.lat) && isNum(p.lon));
  const O2 = { ...O, stations: st };
  const G = F.latest.ok ? buildGrid(F.latest.data.municipalities) : null;
  const reporting = (O.stations || []).filter(p => p.reading).length;
  const hourAge = O.hour_utc ? ageMinutes(O.hour_utc) : null;
  const head = h('p', {}, h('strong', {}, `Hour: ${O.hour_utc ? fmtUTC(O.hour_utc) : 'not given in the file'}. `),
    `${reporting} of ${(O.stations || []).length} stations reported for this hour; ${(O.stations || []).length - reporting} sent nothing (most are late, not broken).`,
    hourAge !== null && hourAge > 180 ? h('strong', {}, ` This hour is ${Math.round(hourAge / 60)} hours old${hourAge > 1440 ? ', older than IPMA\'s own 24-hour feed' : ''}.`) : '');
  if (!st.length) { el.replaceChildren(...[age, h('div', { class: 'panel' }, head, h('p', { class: 'status' }, 'The file lists no station with a position. Nothing is drawn.')), provenance(src)].filter(Boolean)); tb.replaceChildren(); return; }
  const ctl = h('div', { class: 'ctl', role: 'group', 'aria-label': 'Measure on the map' });
  const holder = h('div', { class: 'mapbox' }), legend = h('ul', { class: 'legend', 'aria-label': 'Legend' }), note = h('p', { class: 'map-note' });
  let measure = 'temp';
  const draw = () => {
    ctl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === measure)));
    const t = drawMap(holder, legend, O2, G, measure);
    note.textContent = `${t} ${G ? "Grey land is drawn from IPMA's municipality points, as on the warnings map, so coasts are approximate." : "The land outline could not be drawn (ipma-fire-risk could not be read); station positions are still IPMA's."} The Azores, Madeira and the Selvagens are framed, each at its own scale.`;
  };
  ctl.replaceChildren(...[['temp', 'Temperature'], ['wind', 'Wind']].map(([m, t]) => h('button', { type: 'button', 'data-m': m, 'aria-pressed': String(m === measure), onclick: () => { measure = m; draw(); } }, t)));
  el.replaceChildren(...[age, h('div', { class: 'panel' }, head, ctl, holder, legend, note), provenance(src)].filter(Boolean));
  draw();
  let narrow = holder.clientWidth < 560;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { const n = holder.clientWidth < 560; if (n !== narrow) { narrow = n; draw(); } }).observe(holder);
  const near = townsByStation(O);
  const all = O.stations || [];
  const quiet = all.filter(silent), loud = all.filter(p => !silent(p));
  const hourTxt = O.hour_utc ? `${O.hour_utc.slice(11, 16)} UTC` : 'this hour (not given in the file)';
  tb.replaceChildren(h('div', { class: 'panel' },
    sortableTable(loud, `${loud.length} of ${all.length} stations reported for ${O.hour_utc ? fmtUTC(O.hour_utc) : 'an hour not given in the file'}${quiet.length ? `; the ${quiet.length} that did not are listed below the table` : ''}. IPMA's hourly means; rain is the total for the hour. Nearest to: the towns of this site for which this station is the nearest, with the distance.`, near),
    silentFold(quiet, hourTxt, near)), provenance(src));
}
main().catch(e => {
  for (const id of ['obs', 'table']) { const el = document.getElementById(id); if (el) failure(el, "IPMA's station readings", { error: `the page could not draw the file (${e.message})` }, IPMA_OBS); }
});
