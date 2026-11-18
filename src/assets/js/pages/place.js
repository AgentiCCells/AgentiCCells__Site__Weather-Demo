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

import { loadSource, getJSON, urls, failure, provLine, statusBand, termsBlock, sourceState, fmtDay, fmtUTC, ageMinutes, h } from '../data.js';
import { WEATHER_TYPES, WIND_CLASS, WIND_DIR_ID, RCM_LEVELS, uvBand, UV_BANDS } from '../codes.js';
import { placeById, areaOf, findWarnings, findForecast, findStation, findSea, findUV, findFireRisk, dicoOf, byPlaceFor, slug, SEA_NEAR_KM } from '../places.js';
import { swatch, lvl, levelWord, levelsFor, warningWindows, lisbonNow, fmtPT, fmtSpan, areaName } from '../map.js';

const API = 'https://data.promptugal.news/api/v1';
const SOURCES = [
  { key: 'warnings', id: 'ipma-warnings', name: 'Warnings', href: '/warnings/', what: "IPMA's warnings", page: 'https://www.ipma.pt/en/otempo/prev-sam/' },
  { key: 'forecasts', id: 'ipma-city-forecasts', name: 'Forecast', href: '/forecasts/', what: "IPMA's forecasts", page: 'https://www.ipma.pt/en/otempo/prev.localidade.hora/' },
  { key: 'observations', id: 'ipma-observations', name: 'Stations', href: '/observations/', what: "IPMA's station readings", page: 'https://www.ipma.pt/en/otempo/obs.superficie/' },
  { key: 'sea', id: 'ipma-sea', name: 'Sea', href: '/sea/', what: "IPMA's sea forecast", page: 'https://www.ipma.pt/en/maritima/costeira/' },
  { key: 'uv', id: 'ipma-uv', name: 'UV', href: '/uv/', what: "IPMA's UV index forecast", page: 'https://www.ipma.pt/en/otempo/prev.uv/' },
  { key: 'fire', id: 'ipma-fire-risk', name: 'Fire risk', href: '/fire-risk/', what: "IPMA's fire risk forecast", page: 'https://www.ipma.pt/en/riscoincendio/rcm.pt/' },
];
const BY_KEY = Object.fromEntries(SOURCES.map(s => [s.key, s]));
const STORM = new Set([1110600, 2310300]); // Lisboa and Funchal (proposal 1.3.10)
const LAST = 'wd-last-town';

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const v1 = (v, unit) => isNum(v) ? `${v} ${unit}`.replace(' %', '%') : null;
const none = () => h('span', { class: 'muted' }, 'no value');
const today = () => lisbonNow().slice(0, 10);
const dayLabel = ymd => ymd === today() ? `Today, ${fmtDay(ymd)}` : fmtDay(ymd);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const kmText = km => `${km} km`;
const vh = t => h('span', { class: 'pc-vh' }, t);

// ---------- state ----------
const res = {};        // key -> loadSource() result, once read
const slow = {};       // key -> true after SLOW_MS without an answer
const loads = {};      // key -> promise
let current = null;    // the place shown
let els = null;        // the card's elements

function startLoads() {
  for (const S of SOURCES) {
    loads[S.key] = loadSource(S.id, { onSlow: () => { slow[S.key] = true; if (!res[S.key]) { fillBlock(S.key); updateBand(); } } })
      .then(r => { res[S.key] = r; return r; });
  }
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
  const copyBtn = h('button', { type: 'button', class: 'pc-btn', onclick: () => copyLink(copyMsg) }, 'Copy link to this town');
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
  const storm = STORM.has(p.id) ? h('p', { class: 'pc-storm' }, 'A storm archive for this place: ', h('a', { href: '/storm-charles/' }, 'Storm Charles, 10 to 12 November 2026'), '. A past event, kept as it was, not current weather.') : null;
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

async function copyLink(msg) {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    msg.textContent = 'Link copied.';
  } catch {
    const inp = h('input', { type: 'text', readonly: true, value: url, class: 'pc-url', 'aria-label': 'Link to this town' });
    msg.replaceChildren('Copying was refused; the link is selected here: ', inp);
    inp.select();
  }
}

// ---------- each block ----------
// Each renderer: (place, data, src) -> { body: [nodes], clause: string for the summary, how: string }.
const shape = what => ({ body: [h('p', { class: 'status warn' }, `The ${what} file was read but its shape has changed, so this block cannot be matched to the town. Nothing is shown in its place.`)], clause: null, how: 'the file\'s shape has changed' });

function rWarnings(p, L, src) {
  if (!Array.isArray(L.active)) return shape('warnings');
  const list = findWarnings(p, L) || [];
  const now = lisbonNow();
  const wins = warningWindows(now);
  const strip = h('ol', { class: 'pc-strip', 'aria-label': `Highest warning level for the ${areaName(p.area)} area` }, wins.map(w => {
    const l = levelsFor(L.active, w)[p.area]?.level || 'green';
    return h('li', {}, h('span', { class: 'pc-win' }, w.id === 'now' ? 'Now' : w.id === 'today' ? 'Today' : w.id === 'tomorrow' ? 'Tomorrow' : 'Day after'),
      lvl(l, l === 'green' ? 'None' : levelWord(l)), vh(l === 'green' ? ': no yellow, orange or red warning' : ' warning'));
  }));
  const valid = list.filter(w => typeof w.start === 'string' && typeof w.end === 'string');
  const live = valid.filter(w => w.end > now).sort((a, b) => a.start.localeCompare(b.start));
  const ended = valid.length - live.length;
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
  // Summary clause.
  const nowW = live.filter(w => w.start <= now);
  let clause;
  if (nowW.length) {
    const top = nowW.reduce((a, b) => (['yellow', 'orange', 'red'].indexOf(b.level) > ['yellow', 'orange', 'red'].indexOf(a.level) ? b : a));
    const types = [...new Set(nowW.filter(w => w.level === top.level).map(w => w.type || w.type_pt))].join(' and ');
    const end = nowW.filter(w => w.level === top.level).map(w => w.end).sort().pop();
    clause = `${levelWord(top.level)} warning for ${types} until ${end.slice(0, 10) === now.slice(0, 10) ? end.slice(11, 16) + ' today' : fmtPT(end)} (Portugal time).`;
  } else if (live.length) {
    clause = `No warning in force now; ${live[0].level} warning for ${live[0].type || live[0].type_pt} from ${fmtPT(live[0].start)} (Portugal time).`;
  } else clause = 'No yellow, orange or red warning in IPMA\'s file.';
  return { body, clause, how: `${plural(live.length, 'spell')} in force or upcoming for ${p.area}` };
}

// One temperature scale for all 35 places in the file, so two towns compare by eye.
function forecastScale(L) {
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

function readingList(r) {
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

const uvTile = v => {
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
    b0 ? h('span', {}, b0.name, h('span', { class: 'muted' }, ` (WHO band ${b0.who_range})`)) : t0.length > 1 ? h('span', { class: 'muted' }, `IPMA gives ${t0.length} values for this day; both are shown.`) : null));
  if (cur.length > 1) body.push(h('ul', { class: 'pc-uv-next' }, cur.slice(1).map(d => h('li', {}, h('span', { class: 'muted' }, fmtDay(d)), h('span', { class: 'pc-uv-split' }, vals(d).map(uvTile))))));
  if (dates.length > cur.length) body.push(h('p', { class: 'note' }, `${plural(dates.length - cur.length, 'day')} before today not shown.`));
  const clause = t0.length === 1 && isNum(t0[0]) ? `UV ${t0[0]}${b0 ? ` (${b0.name.toLowerCase()})` : ''}${f.exact ? '' : ` for ${f.place.name}`}.` : null;
  return { body, clause, how: f.exact ? `places[] where id = ${p.id}, exact` : `id ${p.id} not in the file; nearest UV place in the town table: ${f.place.name}, ${kmText(f.km)}` };
}

const rcmTile = c => h('span', { class: `pc-rcm pc-rcm-${RCM_LEVELS[c] ? c : 0}`, 'aria-hidden': 'true' });
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

const RENDER = { warnings: rWarnings, forecasts: rForecast, observations: rStation, sea: rSea, uv: rUV, fire: rFire };
const FAILED = { warnings: 'Warnings not read.', forecasts: 'Forecast not read.', observations: 'Stations not read.', sea: 'Sea not read.', uv: 'UV not read.', fire: 'Fire risk not read.' };
const outcome = {}; // key -> { clause, how } for the current place

function fillBlock(key) {
  if (!els || !current) return;
  const S = BY_KEY[key], B = els.blocks[key], src = res[key];
  B.el.classList.remove('blk-stale', 'blk-old', 'blk-missing');
  if (!src) {
    B.body.replaceChildren(h('p', { class: 'status loading', role: 'status' }, slow[key]
      ? `Still reading the ${S.name.toLowerCase()} file: data.promptugal.news is slow to answer.`
      : `Reading ${S.what} from data.promptugal.news...`));
    B.prov.replaceChildren(provLine({ id: S.id }, { slow: slow[key] }));
    return;
  }
  // Islands and fire risk: the sentence does not depend on the file.
  if (key === 'fire' && !dicoOf(current)) {
    const o = rFire(current, null);
    B.body.replaceChildren(...o.body); outcome[key] = o;
    B.prov.replaceChildren(provLine(src));
    return;
  }
  if (!src.latest.ok) {
    failure(B.body, `${S.what} (${S.id})`, src.latest, S.page);
    B.el.classList.add('blk-missing');
    outcome[key] = { clause: FAILED[key], how: `not read: ${src.latest.error}` };
  } else {
    let o;
    try { o = RENDER[key](current, src.latest.data, src); } catch (e) { o = shape(S.name.toLowerCase()); }
    B.body.replaceChildren(...o.body.filter(Boolean));
    outcome[key] = o;
    const st = sourceState(src);
    if (st.level === 'stale' || st.level === 'old') B.el.classList.add(`blk-${st.level}`);
  }
  B.prov.replaceChildren(provLine(src));
}

function updateBand() {
  if (!els) return;
  const { el } = statusBand(SOURCES.map(S => ({ id: S.id, name: S.name, href: `#h-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' });
  els.band.replaceChildren(el);
}

function finish() {
  if (!els || !current) return;
  // Summary: only from values on the card; a block without a value gives its reason instead.
  const parts = ['warnings', 'forecasts', 'observations', 'uv', 'fire'].map(k => outcome[k]?.clause).filter(Boolean);
  els.summary.textContent = `${current.name}: ${parts.join(' ')}`;
  els.terms.replaceChildren(termsBlock(SOURCES.map(S => res[S.key] || { id: S.id })));
  howTable();
}

function howTable() {
  const rows = SOURCES.map(S => h('tr', {}, h('th', { scope: 'row' }, S.name),
    h('td', {}, h('a', { href: urls(S.id).latest }, `${S.id}/latest.json`)),
    h('td', {}, outcome[S.key]?.how || 'not read yet')));
  const snippet = `const api = '${API}';
const f = await fetch(\`\${api}/ipma-city-forecasts/latest.json\`).then(r => r.json());
const town = f.cities.find(c => c.id === ${current.id}); // ${current.name}
console.log(town.name, f.read_at, town.days[0]);`;
  els.howBody.replaceChildren(
    h('p', {}, 'Each block reads one file and picks the record for this town. The joins are in ', h('a', { href: '/assets/js/places.js' }, 'places.js'), '; nothing is copied into this site.'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'stack' }, h('caption', {}, `How each block was matched to ${current.name} (${current.lat}, ${current.lon}, warning area ${current.area})`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Block'), h('th', { scope: 'col' }, 'File'), h('th', { scope: 'col' }, 'Key and join'))),
      h('tbody', {}, rows))),
    h('p', {}, 'The forecast for this town, in your own JavaScript (no key, CORS open):'),
    h('pre', { class: 'pc-code' }, h('code', {}, snippet)),
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
