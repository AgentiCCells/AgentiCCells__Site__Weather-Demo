// place-blocks.js: the blocks of the place card, as pure parts that any page can import: the six
// sources, one renderer per block, the warnings sentence, the shared scales, the loading of the
// six files, and the town helpers the designs under /d/ share (URL, select, history). Nothing runs
// on import. Each renderer shows what a file holds or says why it cannot; nothing is guessed.
// ES module. Code Apache-2.0.
// The renderers were written by developer.weather-demo@AgentiCCells.dinis (instance A), round 1,
// in pages/place.js (see that file's header for their sources); moved here unchanged in behaviour
// by developer.weather-demo@AgentiCCells.dinis (instance C), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md section 1, which fixes the names and signatures exported here.

import { loadSource, urls, failure, provLine, sourceState, fmtDay, fmtUTC, ageMinutes, h } from './data.js';
import { WEATHER_TYPES, WIND_CLASS, WIND_DIR_ID, RCM_LEVELS, uvBand, UV_BANDS } from './codes.js';
import { PLACES, placeById, areaOf, findWarnings, findForecast, findStation, findSea, findUV, findFireRisk, dicoOf, SEA_NEAR_KM } from './places.js';
import { swatch, lvl, levelWord, levelsFor, warningWindows, lisbonNow, fmtPT, fmtSpan, areaName, ORDER } from './map.js';

const API = 'https://data.promptugal.news/api/v1';
export const SOURCES = [
  { key: 'warnings', id: 'ipma-warnings', name: 'Warnings', href: '/warnings/', what: "IPMA's warnings", page: 'https://www.ipma.pt/en/otempo/prev-sam/' },
  { key: 'forecasts', id: 'ipma-city-forecasts', name: 'Forecast', href: '/forecasts/', what: "IPMA's forecasts", page: 'https://www.ipma.pt/en/otempo/prev.localidade.hora/' },
  { key: 'observations', id: 'ipma-observations', name: 'Stations', href: '/observations/', what: "IPMA's station readings", page: 'https://www.ipma.pt/en/otempo/obs.superficie/' },
  { key: 'sea', id: 'ipma-sea', name: 'Sea', href: '/sea/', what: "IPMA's sea forecast", page: 'https://www.ipma.pt/en/maritima/costeira/' },
  { key: 'uv', id: 'ipma-uv', name: 'UV', href: '/uv/', what: "IPMA's UV index forecast", page: 'https://www.ipma.pt/en/otempo/prev.uv/' },
  { key: 'fire', id: 'ipma-fire-risk', name: 'Fire risk', href: '/fire-risk/', what: "IPMA's fire risk forecast", page: 'https://www.ipma.pt/en/riscoincendio/rcm.pt/' },
];
export const BY_KEY = Object.fromEntries(SOURCES.map(s => [s.key, s]));
export const STORM = new Set([1110600, 2310300]); // Lisboa and Funchal (proposal 1.3.10)

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const v1 = (v, unit) => isNum(v) ? `${v} ${unit}`.replace(' %', '%') : null;
const none = () => h('span', { class: 'muted' }, 'no value');
const today = () => lisbonNow().slice(0, 10);
const dayLabel = ymd => ymd === today() ? `Today, ${fmtDay(ymd)}` : fmtDay(ymd);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const kmText = km => `${km} km`;
const vh = t => h('span', { class: 'pc-vh' }, t);

// ---------- each block ----------
// Each renderer: (place, data, src) -> { body: [nodes], clause: string for the summary, how: string }.
export const shape = what => ({ body: [h('p', { class: 'status warn' }, `The ${what} file was read but its shape has changed, so this block cannot be matched to the town. Nothing is shown in its place.`)], clause: null, how: 'the file\'s shape has changed' });

// The area's spells not yet ended (end after now, Portugal time), sorted by start, and how many of
// the area's spells in the file have already ended. Spells without a start or end are left out.
export function liveSpells(place, warningsData, now = lisbonNow()) {
  const list = (warningsData && Array.isArray(warningsData.active) ? findWarnings(place, warningsData) : null) || [];
  const valid = list.filter(w => typeof w.start === 'string' && typeof w.end === 'string');
  const live = valid.filter(w => w.end > now).sort((a, b) => a.start.localeCompare(b.start));
  return { live, ended: valid.length - live.length };
}

function rWarnings(p, L, src) {
  if (!Array.isArray(L.active)) return shape('warnings');
  const now = lisbonNow();
  const wins = warningWindows(now);
  const strip = h('ol', { class: 'pc-strip', 'aria-label': `Highest warning level for the ${areaName(p.area)} area` }, wins.map(w => {
    const l = levelsFor(L.active, w)[p.area]?.level || 'green';
    return h('li', {}, h('span', { class: 'pc-win' }, w.id === 'now' ? 'Now' : w.id === 'today' ? 'Today' : w.id === 'tomorrow' ? 'Tomorrow' : 'Day after'),
      lvl(l, l === 'green' ? 'None' : levelWord(l)), vh(l === 'green' ? ': no yellow, orange or red warning' : ' warning'));
  }));
  const { live, ended } = liveSpells(p, L, now);
  const st = sourceState(src);
  const body = [strip];
  if (!live.length) body.push(h('p', { class: 'pc-calm' }, `No yellow, orange or red warning for the ${areaName(p.area)} area in IPMA's file.`));
  else body.push(h('ul', { class: 'wl' }, live.map(w => h('li', {}, swatch(w.level), h('div', {},
    h('strong', {}, `${levelWord(w.level)}, ${w.type || w.type_pt || 'type not given'}`), w.start <= now ? h('span', { class: 'muted' }, ' (in force now)') : null, h('br'),
    h('span', { class: 'muted' }, `${fmtSpan(w)} (Portugal time, as IPMA gives it)`),
    w.text ? h('details', { lang: 'pt' }, h('summary', { lang: 'en-GB' }, "IPMA's text, in Portuguese"), h('p', {}, w.text)) : null)))));
  if (ended) body.push(h('p', { class: 'note' }, `${plural(ended, 'spell')} already ended ${ended === 1 ? 'is' : 'are'} not shown.`));
  if (st.level === 'old') body.push(h('p', { class: 'status warn' }, 'These warnings may have ended or changed: see ', h('a', { href: BY_KEY.warnings.page }, 'ipma.pt'), '.'));
  body.push(h('p', { class: 'note' }, h('a', { href: '/warnings/' }, 'All warnings on the map'),
    '. MeteoAlarm relays the same IPMA warnings in English; this card does not match its areas to towns, so see them on the ', h('a', { href: '/warnings/' }, 'warnings page'), ' or at ', h('a', { href: 'https://www.meteoalarm.org/' }, 'meteoalarm.org'), '.'));
  // Summary clause (warningClause below): each type with its own end, and a higher level later.
  const clause = warningClause(live, now);
  return { body, clause, how: `${plural(live.length, 'spell')} in force or upcoming for ${p.area}` };
}

// The warnings sentence of the summary, from the spells in IPMA's file only (live: spells not yet
// ended, sorted by start). Each type in force now gets its own level and end; when a later spell of
// that type has a higher level, it is named too ("then orange until ..." when it follows on, or
// "orange from ... to ..." when it does not). A type not in force now is named when its highest
// later level is above every level in force now. Times are as IPMA gives them (Portugal time).
const RANK = { yellow: 1, orange: 2, red: 3 };
const rank = l => RANK[l] || 0;
export function warningClause(live, now) {
  if (!live.length) return 'No yellow, orange or red warning in IPMA\'s file.';
  const t0 = now.slice(0, 10);
  const at = t => t.slice(0, 10) === t0 ? `${t.slice(11, 16)} today` : fmtPT(t);
  const typeOf = w => w.type || w.type_pt || 'a type not given';
  const types = [...new Set(live.map(typeOf))];
  const inForce = live.filter(w => w.start <= now);
  const topNow = Math.max(0, ...inForce.map(w => rank(w.level)));
  const parts = [];
  for (const ty of types) {
    const spells = live.filter(w => typeOf(w) === ty);
    const cur = spells.filter(w => w.start <= now);
    const later = spells.filter(w => w.start > now);
    if (cur.length) {
      const r = Math.max(...cur.map(w => rank(w.level)));
      const c = cur.filter(w => rank(w.level) === r).sort((a, b) => b.end.localeCompare(a.end))[0];
      const hi = later.filter(w => rank(w.level) > r).sort((a, b) => rank(b.level) - rank(a.level) || a.start.localeCompare(b.start))[0];
      // Does the higher spell follow on without a gap (through spells of this type at level r or more)?
      let reach = c.end;
      for (const w of later) { if (w === hi || w.start > reach) break; if (rank(w.level) >= r && w.end > reach) reach = w.end; }
      let txt;
      if (!hi) txt = `${c.level} for ${ty} until ${at(c.end)}`;
      else if (hi.start <= reach) txt = `${c.level} for ${ty} until ${at(hi.start)}, then ${hi.level} until ${at(hi.end)}`;
      else txt = `${c.level} for ${ty} until ${at(c.end)}, and ${hi.level} from ${at(hi.start)} to ${at(hi.end)}`;
      parts.push({ order: 0, start: c.start, txt });
    } else {
      const hi = later.slice().sort((a, b) => rank(b.level) - rank(a.level) || a.start.localeCompare(b.start))[0];
      if (hi && (rank(hi.level) > topNow || !inForce.length)) parts.push({ order: 1, start: hi.start, txt: `${hi.level} for ${ty} from ${at(hi.start)} to ${at(hi.end)}` });
    }
  }
  parts.sort((a, b) => a.order - b.order || a.start.localeCompare(b.start));
  const nowParts = parts.filter(x => x.order === 0).map(x => x.txt);
  const laterParts = parts.filter(x => x.order === 1).map(x => x.txt);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  let out;
  if (nowParts.length) {
    out = `Warnings in force: ${nowParts.join('; ')}`;
    if (laterParts.length) out += `; later: ${laterParts.join('; ')}`;
  } else out = `No warning in force now; later: ${laterParts.join('; ')}`;
  return `${cap(out)} (Portugal time).`;
}

// One temperature scale for all 35 places in the file, so two towns compare by eye.
export function forecastScale(L) {
  const t = today();
  const vals = (L.cities || []).flatMap(c => (c.days || []).filter(d => d.date >= t).flatMap(d => [d.t_min_c, d.t_max_c])).filter(isNum);
  if (!vals.length) return null;
  const lo = Math.floor(Math.min(...vals) / 5) * 5, hi = Math.max(lo + 5, Math.ceil(Math.max(...vals) / 5) * 5);
  return { lo, hi, pct: v => ((v - lo) / (hi - lo)) * 100 };
}
function rForecast(p, L) {
  if (!Array.isArray(L.cities)) return shape('forecast');
  const c = findForecast(p, L);
  if (!c) return { body: [h('p', { class: 'status' }, `IPMA's forecast file has no entry for ${p.name} (id ${p.id}). Nothing is shown in its place.`)], clause: 'No forecast for this town in the file.', how: 'no entry with this id' };
  const t = today();
  const all = (c.days || []).filter(d => typeof d.date === 'string');
  const days = all.filter(d => d.date >= t);
  const dropped = all.length - days.length;
  const sc = forecastScale(L);
  const body = [];
  const upd = c.updated;
  const updAge = upd ? ageMinutes(/Z$/.test(upd) ? upd : upd + 'Z') : null;
  if (updAge !== null && updAge > 14 * 60) body.push(h('p', { class: 'status warn' }, `IPMA's run is ${Math.round(updAge / 60)} h old; a newer forecast may exist. See `, h('a', { href: BY_KEY.forecasts.page }, 'ipma.pt'), '.'));
  if (!days.length) {
    body.push(h('p', { class: 'status' }, `Every day in the file for ${p.name} is before today (${fmtDay(t)}, Lisbon date). Nothing is shown in its place.`));
    return { body, clause: 'No forecast days from today in the file.', how: `cities[] where id = ${p.id}` };
  }
  body.push(h('ol', { class: 'pc-days' }, days.map(d => {
    const ok = isNum(d.t_min_c) && isNum(d.t_max_c) && sc;
    const wx = d.weather_type > 0 ? WEATHER_TYPES[d.weather_type] : null;
    const wind = d.wind_dir ? `wind ${d.wind_dir}${WIND_CLASS[d.wind_class] ? ', ' + WIND_CLASS[d.wind_class].toLowerCase() : ''}` : 'wind not given';
    return h('li', { class: 'pc-day' },
      h('span', { class: 'pc-d' }, d.date === t ? ['Today', h('small', {}, fmtDay(d.date))] : [fmtDay(d.date).split(' ')[0], h('small', {}, fmtDay(d.date).split(' ').slice(1).join(' '))]),
      h('span', { class: 'pc-t' }, ok ? `${d.t_min_c} to ${d.t_max_c} °C` : 'temperature not given'),
      h('span', { class: 'pc-bar', 'aria-hidden': 'true' }, ok ? h('i', { style: `left:${sc.pct(d.t_min_c)}%;width:${Math.max(sc.pct(d.t_max_c) - sc.pct(d.t_min_c), 1.5)}%` }) : null),
      h('span', { class: 'pc-rain' }, h('b', { 'aria-hidden': 'true' }, isNum(d.rain_prob_pct) ? h('i', { style: `width:${Math.min(100, Math.max(0, d.rain_prob_pct))}%` }) : null),
        isNum(d.rain_prob_pct) ? `rain ${d.rain_prob_pct}%` : 'chance of rain not given'),
      h('span', { class: 'pc-wx' }, wx || 'weather not given'),
      h('span', { class: 'pc-wind' }, wind));
  })));
  body.push(h('p', { class: 'note' }, sc ? `Bars: minimum to maximum temperature on one scale for all ${(L.cities || []).length} places in the file, ${sc.lo} to ${sc.hi} °C; rain: IPMA's chance of rain for the day. ` : '',
    upd ? `IPMA's forecast run: ${fmtPT(upd)} (IPMA's time, as given).` : 'IPMA gives no run time for this place.',
    dropped ? ` ${plural(dropped, 'day')} before today ${dropped === 1 ? 'is' : 'are'} not shown.` : ''));
  const d0 = days[0];
  const clause = `${d0.date === t ? 'Today' : fmtDay(d0.date)} ${isNum(d0.t_min_c) && isNum(d0.t_max_c) ? `${d0.t_min_c} to ${d0.t_max_c} °C` : 'temperature not given'}${isNum(d0.rain_prob_pct) ? `, rain ${d0.rain_prob_pct}%` : ''}.`;
  return { body, clause, how: `cities[] where id = ${p.id}: ${c.name}, exact` };
}

export function readingList(r) {
  const dir = WIND_DIR_ID[r.wind_dir_id];
  const row = (k, v) => [h('dt', {}, k), h('dd', {}, v ?? none())];
  return h('dl', { class: 'pc-dl' },
    row('Temperature', v1(r.temp_c, '°C')),
    row('Humidity', v1(r.humidity_pct, '%')),
    row('Wind', isNum(r.wind_kmh) ? `${r.wind_kmh} km/h${dir ? ' from ' + dir : r.wind_dir_id === 0 ? ', no direction' : ''}` : null),
    row('Rain in the hour', v1(r.rain_mm, 'mm')),
    row('Pressure', v1(r.pressure_hpa, 'hPa')));
}
function rStation(p, L) {
  if (!Array.isArray(L.stations)) return shape('stations');
  const f = findStation(p, L);
  if (!f) return { body: [h('p', { class: 'status' }, 'No station in the file has a position, so none can be matched to the town.')], clause: 'No station matched.', how: 'no station with a position' };
  const hour = L.hour_utc ? fmtUTC(L.hour_utc).split(', ')[1] : 'an unknown hour';
  const body = [];
  const n = f.nearest, r = f.reporting;
  const lag = L.hour_utc && L.read_at ? (Date.parse(L.read_at) - Date.parse(L.hour_utc)) / 3600000 : null;
  if (lag !== null && lag > 3) body.push(h('p', { class: 'status warn' }, `These readings are for ${hour}, ${Math.round(lag)} h before the read.`));
  let clause;
  if (n.station.reading) {
    body.push(h('p', {}, h('strong', {}, n.station.name), `, ${kmText(n.km)} away, readings for ${hour}.`), readingList(n.station.reading));
    clause = `${n.station.name} station: ${isNum(n.station.reading.temp_c) ? n.station.reading.temp_c + ' °C' : 'no temperature'} at ${hour}.`;
  } else if (r) {
    body.push(h('p', {}, h('strong', {}, n.station.name), ` (${kmText(n.km)}) sent nothing for ${hour}. Nearest station that did: `, h('strong', {}, r.station.name), `, ${kmText(r.km)} away.`), readingList(r.station.reading));
    clause = `${r.station.name} station: ${isNum(r.station.reading.temp_c) ? r.station.reading.temp_c + ' °C' : 'no temperature'} at ${hour}.`;
  } else {
    body.push(h('p', { class: 'status' }, `No station in IPMA's file sent a reading for ${hour}. The nearest is ${n.station.name}, ${kmText(n.km)} away.`));
    clause = 'No station reading.';
  }
  return { body, clause, how: `nearest of ${L.stations.length} stations by haversine from ${p.lat}, ${p.lon}: ${n.station.name}, ${kmText(n.km)}${r && r !== n && r.station !== n.station ? `; nearest reporting: ${r.station.name}, ${kmText(r.km)}` : ''}` };
}

function rSea(p, L) {
  if (!Array.isArray(L.coasts)) return shape('sea');
  const f = findSea(p, L);
  if (!f) return { body: [h('p', { class: 'status' }, 'No coastal point in the file has a position.')], clause: null, how: 'no coastal point with a position' };
  const how = `nearest of ${L.coasts.length} coastal points by haversine: ${f.coast.name}, ${kmText(f.km)}; ${f.near ? 'within' : 'beyond'} ${SEA_NEAR_KM} km (this site's choice)`;
  if (!f.near) return { body: [h('p', {}, `No sea point within ${SEA_NEAR_KM} km (${SEA_NEAR_KM} km is this site's choice, not IPMA's rule). The nearest is ${f.coast.name}, ${kmText(f.km)} away. `, h('a', { href: '/sea/' }, 'All coasts'), '.')], clause: null, how };
  const t = today();
  const all = (f.coast.days || []).filter(d => typeof d.date === 'string');
  const days = all.filter(d => d.date >= t);
  const dropped = all.length - days.length;
  const vals = L.coasts.flatMap(c => (c.days || []).filter(d => d.date >= t).flatMap(d => [d.sea_max_m, d.waves_max_m])).filter(isNum);
  const hi = vals.length ? Math.max(1, Math.ceil(Math.max(...vals))) : null;
  const rng = (a, b, u) => isNum(a) && isNum(b) ? (a === b ? `${a} ${u}` : `${a} to ${b} ${u}`) : null;
  const body = [h('p', {}, h('strong', {}, f.coast.name), `, ${kmText(f.km)} away (within ${SEA_NEAR_KM} km, this site's choice).`)];
  if (!days.length) body.push(h('p', { class: 'status' }, 'Every day in the file for this coast is before today. Nothing is shown in its place.'));
  else body.push(h('ul', { class: 'pc-sea' }, days.map(d => h('li', {},
    h('strong', {}, dayLabel(d.date)),
    hi && isNum(d.sea_min_m) && isNum(d.sea_max_m) ? h('span', { class: 'pc-bar', 'aria-hidden': 'true' }, h('i', { style: `left:${d.sea_min_m / hi * 100}%;width:${Math.max((d.sea_max_m - d.sea_min_m) / hi * 100, 1.5)}%` })) : null,
    h('span', {}, `Total sea ${rng(d.sea_min_m, d.sea_max_m, 'm') || 'not given'}`),
    h('span', { class: 'muted' }, `Swell ${rng(d.waves_min_m, d.waves_max_m, 'm') || 'not given'}${d.wave_dir ? ', from ' + d.wave_dir : ''}${rng(d.wave_period_min_s, d.wave_period_max_s, 's') ? ', period ' + rng(d.wave_period_min_s, d.wave_period_max_s, 's') : ''}`),
    h('span', { class: 'muted' }, `Sea temperature ${rng(d.sea_temp_min_c, d.sea_temp_max_c, '°C') || 'not given'}`)))));
  body.push(h('p', { class: 'note' }, hi ? `Bars: IPMA's total sea (significant wave height), on one scale for all ${L.coasts.length} coasts, 0 to ${hi} m.` : '', dropped ? ` ${plural(dropped, 'day')} before today not shown.` : ''));
  const d0 = days[0];
  return { body, clause: d0 && isNum(d0.sea_max_m) ? `Sea at ${f.coast.name}: up to ${d0.sea_max_m} m.` : null, how };
}

// A UV band's range as IPMA applies it to one-decimal values (codes.js: min inclusive, max exclusive):
// "below 3", "3 to below 6", "11 and above". Not WHO's whole-number ranges, which a decimal can contradict.
export const uvRange = b => b.min <= 0 ? `below ${b.max}` : Number.isFinite(b.max) ? `${b.min} to below ${b.max}` : `${b.min} and above`;
export const uvTile = v => {
  const b = uvBand(v);
  return h('span', { class: `pc-uv pc-uv-b${b ? UV_BANDS.indexOf(b) + 1 : 0}` }, isNum(v) ? String(v) : 'no value', b ? vh(` ${b.name}`) : null);
};
function rUV(p, L) {
  if (!Array.isArray(L.places)) return shape('UV');
  const f = findUV(p, L);
  if (!f) return { body: [h('p', { class: 'status' }, `IPMA's UV file has no value for ${p.name} or any town near it. Nothing is shown in its place.`)], clause: 'No UV value.', how: 'no UV place matched' };
  const t = today();
  const dates = [...new Set((f.uv.days || []).map(d => d.date).filter(Boolean))].sort();
  const cur = dates.filter(d => d >= t);
  const body = [];
  if (!f.exact) body.push(h('p', {}, `IPMA gives no UV for ${p.name}. Shown: `, h('strong', {}, f.place.name), `, ${kmText(f.km)} away.`));
  if (!cur.length) {
    body.push(h('p', { class: 'status' }, 'Every day in the UV file for this place is before today. Nothing is shown in its place.'));
    return { body, clause: 'No UV for today.', how: f.exact ? `places[] where id = ${p.id}, exact` : `id ${p.id} not in the file; nearest UV place in the town table: ${f.place.name}, ${kmText(f.km)}` };
  }
  const vals = d => (f.uv.days || []).filter(x => x.date === d).map(x => x.index);
  const t0 = vals(cur[0]);
  const b0 = t0.length === 1 ? uvBand(t0[0]) : null;
  body.push(h('div', { class: 'pc-uv-now' }, h('span', { class: 'pc-uv-day' }, dayLabel(cur[0])),
    h('span', { class: 'pc-uv-big' }, t0.map(uvTile)),
    b0 ? h('span', {}, b0.name, h('span', { class: 'muted' }, ` (IPMA: ${uvRange(b0)})`)) : t0.length > 1 ? h('span', { class: 'muted' }, `IPMA gives ${t0.length} values for this day; both are shown.`) : null));
  if (cur.length > 1) body.push(h('ul', { class: 'pc-uv-next' }, cur.slice(1).map(d => h('li', {}, h('span', { class: 'muted' }, fmtDay(d)), h('span', { class: 'pc-uv-split' }, vals(d).map(uvTile))))));
  if (dates.length > cur.length) body.push(h('p', { class: 'note' }, `${plural(dates.length - cur.length, 'day')} before today not shown.`));
  const clause = t0.length === 1 && isNum(t0[0]) ? `UV ${t0[0]}${b0 ? ` (${b0.name.toLowerCase()})` : ''}${f.exact ? '' : ` for ${f.place.name}`}.` : null;
  return { body, clause, how: f.exact ? `places[] where id = ${p.id}, exact` : `id ${p.id} not in the file; nearest UV place in the town table: ${f.place.name}, ${kmText(f.km)}` };
}

export const rcmTile = c => h('span', { class: `pc-rcm pc-rcm-${RCM_LEVELS[c] ? c : 0}`, 'aria-hidden': 'true' });
function rFire(p, L) {
  if (!dicoOf(p)) return { body: [h('p', {}, 'No fire-risk data for the islands: IPMA publishes no fire risk class for Madeira or the Azores.')], clause: null, how: 'islands: no DICO code, no fire-risk data' };
  if (!Array.isArray(L.municipalities)) return shape('fire risk');
  const f = findFireRisk(p, L);
  if (!f) return { body: [h('p', { class: 'status' }, 'No municipality in the file could be matched to this town. Nothing is shown in its place.')], clause: null, how: 'no municipality matched' };
  const t = today();
  const all = (f.municipality.days || []).filter(d => typeof d.date === 'string');
  const days = all.filter(d => d.date >= t);
  const word = d => RCM_LEVELS[d.rcm] ? `Class ${d.rcm}, ${RCM_LEVELS[d.rcm].name.toLowerCase()}` : 'no class given';
  const body = [];
  if (!days.length) body.push(h('p', { class: 'status' }, 'Every day in the file for this municipality is before today. Nothing is shown in its place.'));
  else {
    body.push(h('p', { class: 'pc-fire-now' }, h('span', { class: 'muted' }, dayLabel(days[0].date) + ': '), rcmTile(days[0].rcm), h('strong', {}, word(days[0]))));
    if (days.length > 1) body.push(h('ul', { class: 'pc-fire-next' }, days.slice(1).map(d => h('li', {}, h('span', { class: 'muted' }, fmtDay(d.date) + ': '), rcmTile(d.rcm), word(d)))));
  }
  body.push(h('p', { class: 'note' }, `Municipality DICO ${f.municipality.dico}. `,
    f.exact ? (isNum(f.km) && f.km >= 1 ? `The municipality's point in IPMA's file is ${kmText(f.km)} from the town.` : '') : `Nearest municipality point, ${kmText(f.km)} away (the town's own code ${dicoOf(p)} is not in the file).`,
    all.length > days.length ? ` ${plural(all.length - days.length, 'day')} before today not shown.` : ''));
  const d0 = days[0];
  return { body, clause: d0 && RCM_LEVELS[d0.rcm] ? `Fire risk class ${d0.rcm} (${RCM_LEVELS[d0.rcm].name.toLowerCase()}).` : null,
    how: f.exact ? `municipalities[] where dico = ${f.municipality.dico} (digits 2 to 5 of the id), exact` : `code ${dicoOf(p)} not in the file; nearest municipality point, ${kmText(f.km)}` };
}

export const RENDER = { warnings: rWarnings, forecasts: rForecast, observations: rStation, sea: rSea, uv: rUV, fire: rFire };
export const FAILED = { warnings: 'Warnings not read.', forecasts: 'Forecast not read.', observations: 'Stations not read.', sea: 'Sea not read.', uv: 'UV not read.', fire: 'Fire risk not read.' };

// ---------- loading the six files ----------
// Starts loadSource() for the six sources. Returns { res, slow, loads }, objects keyed by source
// key: res[key] is set once the file is read (or has failed), slow[key] once SLOW_MS has passed
// without an answer, and loads[key] is the promise. onSlow(key) is called once per slow file.
export function loadSix({ onSlow } = {}) {
  const res = {}, slow = {}, loads = {};
  for (const S of SOURCES) {
    loads[S.key] = loadSource(S.id, { onSlow: () => { slow[S.key] = true; if (onSlow) onSlow(S.key); } })
      .then(r => { res[S.key] = r; return r; });
  }
  return { res, slow, loads };
}

// ---------- one block, decided without writing to the page ----------
// Returns { body: Node[], prov: Node, level, outcome, mark }:
//   level: sourceState()'s level for the file (reading, slow, fresh, stale, old, unknown, missing);
//   outcome: { clause, how } for the summary and the join table, or null while the file is read;
//   mark: 'stale', 'old' or 'missing' when the block takes a coloured left rule, else null (the
//     islands' fire-risk sentence takes none, as on /place/).
export function renderBlock(key, place, src, { slow = false } = {}) {
  const S = BY_KEY[key];
  const level = sourceState(src || null, { slow }).level;
  if (!src) {
    return {
      body: [h('p', { class: 'status loading', role: 'status' }, slow
        ? `Still reading the ${S.name.toLowerCase()} file: data.promptugal.news is slow to answer.`
        : `Reading ${S.what} from data.promptugal.news...`)],
      prov: provLine({ id: S.id }, { slow }), level, outcome: null, mark: null,
    };
  }
  // Islands and fire risk: the sentence does not depend on the file.
  if (key === 'fire' && !dicoOf(place)) {
    const o = rFire(place, null);
    return { body: o.body, prov: provLine(src), level, outcome: { clause: o.clause, how: o.how }, mark: null };
  }
  if (!src.latest.ok) {
    const div = h('div');
    failure(div, `${S.what} (${S.id})`, src.latest, S.page);
    return { body: [...div.children], prov: provLine(src), level, outcome: { clause: FAILED[key], how: `not read: ${src.latest.error}` }, mark: 'missing' };
  }
  let o;
  try { o = RENDER[key](place, src.latest.data, src); } catch (e) { o = shape(S.name.toLowerCase()); }
  return { body: o.body.filter(Boolean), prov: provLine(src), level, outcome: { clause: o.clause, how: o.how }, mark: level === 'stale' || level === 'old' ? level : null };
}

// A clause from a stale or old file carries that file's age and state word, as its block does,
// so a summary never repeats such figures as current.
const FILE_WORD = { warnings: 'warnings', forecasts: 'forecast', observations: 'stations', sea: 'sea', uv: 'UV', fire: 'fire-risk' };
export function agedClause(key, clause, src) {
  if (!clause) return clause;
  const st = sourceState(src || null);
  if (st.level !== 'stale' && st.level !== 'old') return clause;
  return `${clause.replace(/\.$/, '')}, from a ${FILE_WORD[key]} file read ${st.ago} (${st.level}).`;
}

// "<town>: <clauses>": only from values on the card; a block without a value gives its reason.
export const SUMMARY_KEYS = ['warnings', 'forecasts', 'observations', 'uv', 'fire'];
export function summaryClauses(outcomes, res) {
  return SUMMARY_KEYS.map(k => agedClause(k, outcomes[k]?.clause, res[k])).filter(Boolean);
}
export function summaryText(place, outcomes, res) {
  return `${place.name}: ${summaryClauses(outcomes, res).join(' ')}`;
}

// The join table: for each block, the file and the key or join that picked the record.
export function howTable(place, outcomes) {
  const rows = SOURCES.map(S => h('tr', {}, h('th', { scope: 'row' }, S.name),
    h('td', {}, h('a', { href: urls(S.id).latest }, `${S.id}/latest.json`)),
    h('td', {}, outcomes[S.key]?.how || 'not read yet')));
  return h('div', { class: 'table-wrap' }, h('table', { class: 'stack' }, h('caption', {}, `How each block was matched to ${place.name} (${place.lat}, ${place.lon}, warning area ${place.area})`),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Block'), h('th', { scope: 'col' }, 'File'), h('th', { scope: 'col' }, 'Key and join'))),
    h('tbody', {}, rows)));
}

// The forecast for this town, as a fetch() snippet (no key, CORS open).
export function fetchSnippet(place) {
  return `const api = '${API}';
const f = await fetch(\`\${api}/ipma-city-forecasts/latest.json\`).then(r => r.json());
const town = f.cities.find(c => c.id === ${place.id}); // ${place.name}
console.log(town.name, f.read_at, town.days[0]);`;
}

// Copy text with the Clipboard API; when that is refused, show it in a selected read-only field.
export async function copyText(text, msgEl, { label = 'Link to this town' } = {}) {
  try {
    await navigator.clipboard.writeText(text);
    msgEl.textContent = 'Link copied.';
  } catch {
    const inp = h('input', { type: 'text', readonly: true, value: text, class: 'pc-url', 'aria-label': label });
    msgEl.replaceChildren('Copying was refused; the link is selected here: ', inp);
    inp.select();
  }
}

// The storm archive paragraph for Lisboa and Funchal, or null.
export function stormLine(place) {
  return STORM.has(place.id) ? h('p', { class: 'pc-storm' }, 'A storm archive for this place: ', h('a', { href: '/storm-charles/' }, 'Storm Charles, 10 to 12 November 2026'), '. A past event, kept as it was, not current weather.') : null;
}

// ---------- towns: the URL, a select, history and the designs control ----------
// Parses ?id=a,b and repeated id=. Unknown ids and duplicates are dropped (unknown ones are
// returned as given); over max, the first max are kept and cut says how many were dropped; under
// min, the list is topped up from fallback, skipping towns already in it.
export function placesFromURL(search, { min = 1, max = 1, fallback = [1110600, 1131200] } = {}) {
  const raws = new URLSearchParams(search || '').getAll('id').flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean);
  const places = [], unknown = [];
  for (const raw of raws) {
    const p = /^\d+$/.test(raw) ? placeById(raw) : null;
    if (!p) { unknown.push(raw); continue; }
    if (!places.includes(p)) places.push(p);
  }
  const cut = Math.max(0, places.length - max);
  places.splice(max);
  for (const id of fallback) {
    if (places.length >= min) break;
    const p = placeById(id);
    if (p && !places.includes(p)) places.push(p);
  }
  return { places, unknown, cut };
}

// The 35 towns in three groups, in the home page's order: Mainland by warning area north to
// south (map.js ORDER), the district capital first, then by name; then Madeira; then the Azores.
export function townGroups() {
  const group = p => areaOf(p)?.region === 'mainland' ? 0 : areaOf(p)?.region === 'madeira' ? 1 : 2;
  const sorted = PLACES.slice().sort((a, b) => group(a) - group(b) || ORDER.indexOf(a.area) - ORDER.indexOf(b.area)
    || (b.kind === 'capital') - (a.kind === 'capital') || a.name.localeCompare(b.name, 'pt'));
  return ['Mainland', 'Madeira', 'Azores'].map((label, i) => ({ label, places: sorted.filter(p => group(p) === i) }));
}

// A <select> of the towns in three <optgroup>s; exclude: ids left out.
export function townSelect({ id, name = 'id', selected, exclude = [] } = {}) {
  const ex = new Set(exclude.map(Number));
  return h('select', { id, name }, townGroups().map(g => {
    const ps = g.places.filter(p => !ex.has(p.id));
    return ps.length ? h('optgroup', { label: g.label }, ps.map(p => h('option', { value: p.id, selected: Number(selected) === p.id }, p.name))) : null;
  }));
}

// Writes ?id=<ids, comma-separated> with pushState (or replaceState), keeping other parameters.
export function setTown(ids, { push = true } = {}) {
  const sp = new URLSearchParams(location.search);
  sp.delete('id');
  const rest = sp.toString();
  const url = `${location.pathname}?id=${[ids].flat().join(',')}${rest ? '&' + rest : ''}${location.hash}`;
  history[push ? 'pushState' : 'replaceState']({ ids: [ids].flat() }, '', url);
}

// Adds ?id=<id> to the designs control's links to the designs under /d/ (not the chooser itself),
// so moving between designs keeps the town.
export function keepTown(place) {
  if (!place) return;
  for (const a of document.querySelectorAll('.designs-menu a[href]')) {
    const path = a.getAttribute('href').split(/[?#]/)[0];
    if (path.startsWith('/d/') && path !== '/d/') a.setAttribute('href', `${path}?id=${place.id}`);
  }
}
