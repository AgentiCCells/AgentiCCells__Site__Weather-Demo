// pages/sea.js: IPMA's three-day sea forecast for the coastal places in ipma-sea: total sea
// (significant wave height) and swell as ranges on one metre scale, swell period and wave
// direction as given, and sea temperature as printed numbers.
// Field meanings follow the analyst's notes (team/rounds/1/data/NOTES.md): waves_* is IPMA's
// waveHighMin/Max, the swell; sea_* is IPMA's totalSeaMin/Max, the significant wave height.
// Nothing is guessed, averaged or interpolated. ES module. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance B), 2026-11-18, round 1.
// Adapted from AgentiCCells/AgentiCCells__Site__IPMA-Data, src/assets/js/pages/sea.js (commit 44ed7f8),
// Apache-2.0, same organisation, by developer.weather-demo@AgentiCCells.dinis (instance B), 2026-11-18,
// round 1: under each coast, the towns of PLACES for which it is the nearest sea point within
// SEA_NEAR_KM (places.js findSea), each linking to /place/?id=<globalIdLocal> (design proposal 3.5).
// The 25 km cut-off is this site's choice, not IPMA's (conductor's decision D2), and says so.
import { loadSource, ageBanner, provenance, runStrip, loading, failure, fmtDay, h } from '../data.js';
import { AREAS } from '../codes.js';
import { PLACES, findSea, SEA_NEAR_KM } from '../places.js';

const ID = 'ipma-sea';
const WHAT = "IPMA's sea forecast (ipma-sea)";
const IPMA_PAGE = 'https://www.ipma.pt/en/maritima/costeira/';

const lisbonToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// replaceChildren() would turn null into the text "null" and an array into a string: flatten and drop empties.
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const fin = v => v !== null && v !== undefined && Number.isFinite(Number(v));
const regionOf = c => AREAS[c.area]?.region || ({ 1: 'mainland', 2: 'madeira', 3: 'azores' })[String(c.id)[0]] || 'mainland';
// The island from IPMA's globalIdLocal prefix, not from `area`: the sea file puts Porto Santo in MCS
// and Santa Cruz das Flores in ACE (analyst's notes), so `area` is not used to place them.
const regionById = c => ({ 1: 'mainland', 2: 'madeira', 3: 'azores' })[String(c.id)[0]] || regionOf(c);
const placeName = n => String(n || 'unnamed').replace(/,\s*costa$/i, '');
const range = (a, b, unit = '') => {
  if (!fin(a) && !fin(b)) return 'no value';
  if (!fin(a)) return `max ${b}${unit}`;
  if (!fin(b)) return `min ${a}${unit}`;
  return Number(a) === Number(b) ? `${a}${unit}` : `${a} to ${b}${unit}`;
};
const rangeWords = (a, b, unit) => {
  if (!fin(a) && !fin(b)) return 'no value';
  if (!fin(a)) return `maximum ${b} ${unit}, no minimum given`;
  if (!fin(b)) return `minimum ${a} ${unit}, no maximum given`;
  return Number(a) === Number(b) ? `${a} ${unit}` : `${a} to ${b} ${unit}`;
};
const crossed = d => fin(d.wave_period_min_s) && fin(d.wave_period_max_s) && Number(d.wave_period_min_s) > Number(d.wave_period_max_s);
const period = d => (!fin(d.wave_period_min_s) && !fin(d.wave_period_max_s)) ? 'no value'
  : `min ${fin(d.wave_period_min_s) ? d.wave_period_min_s : 'none'}, max ${fin(d.wave_period_max_s) ? d.wave_period_max_s : 'none'} s`;

// The stale or old line above the chart (data.js ageBanner), as on every data page.
const AGE = { page: IPMA_PAGE };

async function main() {
  const root = document.getElementById('sea');
  const runsEl = document.getElementById('sea-runs');
  const slow = loading(root, "IPMA's sea forecast");
  const src = await loadSource(ID, { reads: true, onSlow: slow });
  runsEl.replaceChildren(runStrip(src.reads));
  if (!src.latest.ok) { failure(root, WHAT, src.latest, IPMA_PAGE); return; }
  const L = src.latest.data;
  const coasts = (Array.isArray(L.coasts) ? L.coasts : []).slice();
  if (!coasts.length) {
    put(root, h('p', { class: 'status', role: 'status' }, 'The sea file was read but lists no coastal places, so there is nothing to draw.'), provenance(src));
    return;
  }
  const today = lisbonToday();
  const fileDates = (L.files || []).map(f => f.date).filter(Boolean);
  const dates = [...new Set([...fileDates, ...coasts.flatMap(c => (c.days || []).map(d => d.date))])].filter(Boolean).sort();
  const current = dates.filter(d => d >= today);
  const past = dates.length - current.length;
  if (!current.length) {
    put(root, ageBanner(src.latest, AGE), h('p', { class: 'status', role: 'status' },
      `Every day in the file is before today (${fmtDay(today)}, Lisbon date), so there is no current sea forecast to draw. See `, h('a', { href: IPMA_PAGE }, 'IPMA'), '.'), provenance(src));
    return;
  }

  // Mainland north to south, then Madeira, then the Azores (each east to west).
  const order = { mainland: 0, madeira: 1, azores: 2 };
  coasts.sort((a, b) => order[regionById(a)] - order[regionById(b)] || (regionById(a) === 'mainland' ? b.lat - a.lat : b.lon - a.lon));

  // One scale for every cell: 0 to the next whole metre above the largest value.
  const vals = coasts.flatMap(c => (c.days || []).filter(d => current.includes(d.date)).flatMap(d => [d.sea_max_m, d.waves_max_m, d.sea_min_m, d.waves_min_m])).filter(fin).map(Number);
  const mx = Math.max(1, Math.ceil(vals.length ? Math.max(...vals) : 1));
  const X = v => (Number(v) / mx) * 100;
  const bar = (a, b, cls) => {
    if (!fin(a) && !fin(b)) return null;
    const lo = fin(a) ? Number(a) : Number(b), hi = fin(b) ? Number(b) : Number(a);
    const l = X(Math.min(lo, hi)), w = X(Math.max(lo, hi)) - l;
    return h('i', { class: `sea-bar ${cls}`, style: `left:${l}%;width:${w}%` });
  };

  // Towns whose nearest sea point is this coast, within SEA_NEAR_KM. Keyed by the coast object.
  const townsBy = new Map();
  for (const p of PLACES) {
    const f = findSea(p, L);
    if (!f || !f.near) continue;
    if (!townsBy.has(f.coast)) townsBy.set(f.coast, []);
    townsBy.get(f.coast).push({ p, km: f.km });
  }
  const nearLine = c => {
    const t = townsBy.get(c); if (!t?.length) return null;
    return h('small', { class: 'sea-towns' }, 'Nearest coast for: ', t.flatMap((x, i) => [i ? ', ' : '', h('a', { href: `/place/?id=${x.p.id}` }, x.p.name), ` (${x.km} km)`]), ` (within ${SEA_NEAR_KM} km)`);
  };

  let crossCount = 0;
  const cells = [];
  cells.push(h('div', { class: 'sea-h sea-corner' }, 'Coastal place'));
  current.forEach(d => cells.push(h('div', { class: 'sea-h' }, d === today ? `Today, ${fmtDay(d)}` : fmtDay(d))));
  for (const c of coasts) {
    const reg = regionById(c);
    const areaNote = c.area && AREAS[c.area] && AREAS[c.area].region !== reg ? ` (file says area ${c.area})` : '';
    const islandFlag = (String(c.id).startsWith('232') && c.area !== 'MPS') || (String(c.id).startsWith('348') && c.area !== 'AOC');
    cells.push(h('div', { class: 'sea-place' }, placeName(c.name),
      h('small', {}, `${reg === 'mainland' ? 'Mainland' : reg === 'madeira' ? 'Madeira' : 'Azores'}, area ${c.area || 'none'}${areaNote}`, islandFlag ? h('span', { class: 'sea-flag', title: 'See the note under the chart' }, ' *') : null),
      nearLine(c)));
    for (const date of current) {
      const d = (c.days || []).find(x => x.date === date);
      if (!d) { cells.push(h('div', { class: 'sea-cell' }, h('span', { class: 'fc-none' }, 'no value for this day'))); continue; }
      const x = crossed(d); if (x) crossCount++;
      const label = `${placeName(c.name)}, ${fmtDay(date)}: total sea ${rangeWords(d.sea_min_m, d.sea_max_m, 'm')}; swell ${rangeWords(d.waves_min_m, d.waves_max_m, 'm')}; swell period ${period(d)}${x ? ' (minimum above maximum, as in IPMA\'s file)' : ''}; direction ${d.wave_dir || 'not given'}; sea temperature ${rangeWords(d.sea_temp_min_c, d.sea_temp_max_c, '°C')}.`;
      cells.push(h('div', { class: 'sea-cell', role: 'group', 'aria-label': label },
        h('div', { class: 'sea-track', style: `--steps:${mx}`, 'aria-hidden': 'true' }, bar(d.sea_min_m, d.sea_max_m, 'total'), bar(d.waves_min_m, d.waves_max_m, 'swell')),
        h('div', { class: 'sea-txt', 'aria-hidden': 'true' },
          h('span', {}, `Total ${range(d.sea_min_m, d.sea_max_m, ' m')}`),
          h('span', {}, `Swell ${range(d.waves_min_m, d.waves_max_m, ' m')}`),
          h('span', { class: 'm' }, `${d.wave_dir || 'no direction'} · period ${fin(d.wave_period_min_s) ? d.wave_period_min_s : 'none'}/${fin(d.wave_period_max_s) ? d.wave_period_max_s : 'none'} s`, x ? h('span', { class: 'sea-flag', style: 'display:inline' }, ' †') : null),
          h('span', { class: 'm' }, `Sea ${range(d.sea_temp_min_c, d.sea_temp_max_c, ' °C')}`))));
    }
  }
  // Axis row: 0 and the top of the scale under every day column.
  cells.push(h('div', { class: 'sea-corner', 'aria-hidden': 'true' }));
  current.forEach(() => cells.push(h('div', { class: 'sea-axis', 'aria-hidden': 'true' }, h('span', {}, '0'), h('span', {}, `${mx} m`))));

  const table = h('table', { class: 'cb-table' },
    h('caption', {}, "Every value drawn above, as given in IPMA's file. Heights in metres, period in seconds, temperature in °C."),
    h('thead', {}, h('tr', {}, ['Place', 'Day', 'Total sea min', 'Total sea max', 'Swell min', 'Swell max', 'Swell period min', 'Swell period max', 'Direction', 'Sea temp. min', 'Sea temp. max']
      .map((t, i) => h('th', { scope: 'col', class: i > 1 && i !== 8 ? 'cb-num' : null }, t)))),
    h('tbody', {}, coasts.flatMap(c => (c.days || []).filter(d => current.includes(d.date)).map((d, i, arr) => h('tr', {},
      i === 0 ? h('th', { scope: 'rowgroup', rowspan: String(arr.length) }, placeName(c.name)) : null,
      h('td', {}, fmtDay(d.date)),
      ...[d.sea_min_m, d.sea_max_m, d.waves_min_m, d.waves_max_m, d.wave_period_min_s, d.wave_period_max_s].map(v => h('td', { class: 'cb-num' }, fin(v) ? v : 'none')),
      h('td', {}, d.wave_dir || 'none'),
      ...[d.sea_temp_min_c, d.sea_temp_max_c].map(v => h('td', { class: 'cb-num' }, fin(v) ? v : 'none')))))));

  const flagged = coasts.filter(c => (String(c.id).startsWith('232') && c.area !== 'MPS') || (String(c.id).startsWith('348') && c.area !== 'AOC'));
  put(root, 
    ageBanner(src.latest, AGE),
    h('figure', { class: 'chart' },
      h('div', { class: 'sea-grid', style: `--days:${current.length}` }, cells),
      h('figcaption', {},
        h('ul', { class: 'cb-legend' },
          h('li', {}, h('span', { class: 'cb-sw sea-key-total' }), 'Total sea: significant wave height, IPMA\'s lowest to highest for the day'),
          h('li', {}, h('span', { class: 'cb-sw sea-key-swell' }), 'Swell height, lowest to highest')),
        `One scale in every cell: 0 to ${mx} m, gridlines every 1 m. Under the bars: the two ranges in metres, IPMA's wave direction as given, the swell's peak period (minimum/maximum, in seconds) and the sea surface temperature.`)),
    h('p', { class: 'cb-note' },
      `${coasts.length} coastal places in IPMA's file${L.counts?.coasts && L.counts.coasts !== coasts.length ? ` (the file's count says ${L.counts.coasts})` : ''}, mainland north to south, then Madeira, then the Azores. Days are labelled by date from IPMA's files.`,
      past ? ` ${past} day${past === 1 ? '' : 's'} before today (Lisbon date) ${past === 1 ? 'is' : 'are'} left out.` : '',
      crossCount ? ` † On ${crossCount} place-day${crossCount === 1 ? '' : 's'} the period's minimum is above its maximum. That is how IPMA's own file gives it; both are shown as given and no mean is worked out.` : '',
      flagged.length ? ` * IPMA's sea file puts ${flagged.map(c => `${placeName(c.name)} in area ${c.area}`).join(' and ')}, which differs from IPMA's warning areas (Porto Santo is MPS, Flores is AOC); it is drawn under its island here.` : '',
      ' The data site\'s own description calls the swell figure the "significant wave height"; IPMA\'s field names say otherwise, and this page follows IPMA.',
      ` "Nearest coast for" names the towns of Your town whose nearest sea point this is, by straight-line distance, when it is within ${SEA_NEAR_KM} km. ${SEA_NEAR_KM} km is this site's choice, not IPMA's rule; ${PLACES.length - [...townsBy.values()].flat().length} of ${PLACES.length} towns have no sea point that close, and Your town says so rather than show a coast far away.`),
    provenance(src, { note: "IPMA's own update time for the sea files is not kept by the collector, so only the read time is known." }),
    h('details', { class: 'cb-more' }, h('summary', {}, 'The sea forecast as a table'),
      h('div', { class: 'cb-scroll', tabindex: '0', role: 'region', 'aria-label': 'The sea forecast as a table' }, table)));
}

main().catch(e => {
  const root = document.getElementById('sea');
  if (root) failure(root, WHAT, { error: `the page could not draw the file (${e.message})` }, IPMA_PAGE);
});
