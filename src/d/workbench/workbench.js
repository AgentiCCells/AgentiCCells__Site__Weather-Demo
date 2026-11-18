// workbench.js: the Workbench design, /d/workbench/?id=<globalIdLocal>. "Use the data" applied to
// one town: the six files with their read times and record counts, then each block as a table of
// JSON paths and values (the path true for this read), the join that picked the record, a fetch
// and a curl to copy, the whole record, and the source line. Nothing is guessed: a value the file
// does not hold reads null, as the file has it. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance D), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md sections 2 and 6.

import { h, statusBand, termsBlock, sourceState, urls, fmtUTC, API } from '/assets/js/data.js';
import { WEATHER_TYPES, WIND_CLASS, WIND_DIR_ID, RCM_LEVELS, uvBand } from '/assets/js/codes.js';
import { areaOf, findWarnings, findForecast, findStation, findSea, findUV, findFireRisk, dicoOf, SEA_NEAR_KM } from '/assets/js/places.js';
import { lisbonNow, areaName } from '/assets/js/map.js';
import { HEADLINES } from '/assets/js/headlines.js';
import { SOURCES, BY_KEY, loadSix, renderBlock, liveSpells, copyText, placesFromURL, townSelect, setTown, keepTown } from '/assets/js/place-blocks.js';

const NAME = 'Workbench';
const TITLE = { warnings: 'Warnings', forecasts: 'Forecast', observations: 'Nearest station', sea: 'Sea', uv: 'UV index', fire: 'Fire risk' };
const COUNT = { warnings: d => d.active, forecasts: d => d.cities, observations: d => d.stations, sea: d => d.coasts, uv: d => d.places, fire: d => d.municipalities };
const COUNT_WORD = { warnings: 'spells in active[]', forecasts: 'places in cities[]', observations: 'stations in stations[]', sea: 'coasts in coasts[]', uv: 'places in places[]', fire: 'municipalities in municipalities[]' };
const wide = matchMedia('(min-width: 1000px)');
const today = () => lisbonNow().slice(0, 10);
const J = v => v === undefined ? 'not in the record' : JSON.stringify(v);
const MAX_LINES = 80;

const { res, slow, loads } = loadSix({ onSlow: () => draw() });
const root = document.getElementById('d-root');
let place = null, unknownMsg = '', els = null;

// ---------- the files panel ----------
function filesPanel() {
  const rows = SOURCES.map(S => {
    const src = res[S.key], st = sourceState(src || null, { slow: slow[S.key] });
    const u = urls(S.id);
    let what, count = '';
    if (!src) what = st.level === 'slow' ? 'still reading: data.promptugal.news is slow' : 'reading...';
    else if (!src.latest.ok) what = `not read: ${src.latest.error}`;
    else {
      const arr = COUNT[S.key](src.latest.data);
      count = Array.isArray(arr) ? `${arr.length} ${COUNT_WORD[S.key]}` : 'record list not found: the shape has changed';
      try { what = HEADLINES[S.id](src.latest.data); } catch { what = 'The file was read but its shape has changed, so no headline is given.'; }
    }
    const read = st.readAt ? `${fmtUTC(st.readAt)}, ${st.ago}` : st.level === 'missing' ? 'not read' : st.word;
    return h('li', { class: `wb-file wb-${st.level}` },
      h('p', { class: 'wb-fid' }, h('code', {}, S.id)),
      h('p', { class: 'wb-links' }, h('a', { href: u.latest }, 'latest.json'), ' · ', h('a', { href: u.card }, 'card.json'), ' · ', h('a', { href: u.reads }, 'reads.json')),
      h('p', { class: 'wb-read' }, read, ['stale', 'old', 'unknown', 'missing'].includes(st.level) && st.readAt ? h('strong', { class: `pl-state pl-${st.level}` }, ` · ${st.word}`) : null),
      count ? h('p', { class: 'wb-count' }, count) : null,
      h('p', { class: 'wb-what' }, what));
  });
  const nRead = SOURCES.filter(S => res[S.key]?.latest?.ok).length;
  const notFresh = SOURCES.filter(S => res[S.key] && sourceState(res[S.key]).level !== 'fresh').length;
  return { rows, summary: `The six files: ${nRead} read, ${notFresh} not fresh` };
}

// ---------- the path tables ----------
// Each builder: (place, data) -> { rows: [[path, value, meaning]], record, fetch, curl, note }.
const today0 = days => (days || []).findIndex(d => typeof d.date === 'string' && d.date >= today());
const BUILD = {
  warnings(p, L) {
    if (!Array.isArray(L.active)) throw new Error('shape');
    const { live } = liveSpells(p, L);
    const rows = live.length ? live.flatMap(w => { const i = L.active.indexOf(w); return [
      [`active[${i}].level`, J(w.level), 'level'], [`active[${i}].type`, J(w.type), 'type, in English'],
      [`active[${i}].start`, J(w.start), 'start, Portugal time, no zone'], [`active[${i}].end`, J(w.end), 'end, Portugal time, no zone']]; })
      : [[`active[] where area == "${p.area}"`, 'no spell', `no yellow, orange or red warning for ${areaName(p.area)} not yet ended`]];
    return { rows, record: findWarnings(p, L),
      fetch: `const w = await fetch('${API}/ipma-warnings/latest.json').then(r => r.json());\nconst spells = w.active.filter(a => a.area === '${p.area}'); // ${areaName(p.area)}\n// Spells whose end has passed stay until IPMA reissues: compare end with the Portugal time now.\nconsole.log(w.read_at, spells);`,
      curl: `curl -s ${API}/ipma-warnings/latest.json | jq '.read_at, [.active[] | select(.area == "${p.area}")]'` };
  },
  forecasts(p, L) {
    if (!Array.isArray(L.cities)) throw new Error('shape');
    const c = findForecast(p, L);
    if (!c) return { rows: [[`cities[] where id == ${p.id}`, 'no entry', 'no forecast for this town in the file']], record: null };
    const i = L.cities.indexOf(c), j = today0(c.days), d = j >= 0 ? c.days[j] : null;
    const rows = [[`cities[${i}].updated`, J(c.updated), "IPMA's run, as given, no zone"]];
    if (d) rows.push([`cities[${i}].days[${j}].date`, J(d.date), 'the first day from today'],
      [`cities[${i}].days[${j}].t_min_c`, J(d.t_min_c), 'lowest, °C'], [`cities[${i}].days[${j}].t_max_c`, J(d.t_max_c), 'highest, °C'],
      [`cities[${i}].days[${j}].rain_prob_pct`, J(d.rain_prob_pct), 'chance of rain, %'],
      [`cities[${i}].days[${j}].weather_type`, J(d.weather_type), WEATHER_TYPES[d.weather_type] || 'not in IPMA\'s table'],
      [`cities[${i}].days[${j}].wind_dir`, J(d.wind_dir), 'wind from'], [`cities[${i}].days[${j}].wind_class`, J(d.wind_class), WIND_CLASS[d.wind_class] || 'no class']);
    else rows.push([`cities[${i}].days[]`, 'no day from today', 'every day in the file is before today']);
    return { rows, record: c,
      fetch: `const f = await fetch('${API}/ipma-city-forecasts/latest.json').then(r => r.json());\nconst town = f.cities.find(c => c.id === ${p.id}); // ${p.name}\nconsole.log(f.read_at, town.days[0].t_min_c, town.days[0].t_max_c);`,
      curl: `curl -s ${API}/ipma-city-forecasts/latest.json | jq '.read_at, (.cities[] | select(.id == ${p.id}) | .days[0])'` };
  },
  observations(p, L) {
    if (!Array.isArray(L.stations)) throw new Error('shape');
    const f = findStation(p, L);
    if (!f) return { rows: [['stations[]', 'no station with a position', '']], record: null };
    const s = (f.reporting || f.nearest).station, km = (f.reporting || f.nearest).km, i = L.stations.indexOf(s);
    const r = s.reading || {};
    const rows = [['hour_utc', J(L.hour_utc), 'the hour of the readings, UTC'], [`stations[${i}].name`, J(s.name), 'station']];
    if (s.reading) rows.push([`stations[${i}].reading.temp_c`, J(r.temp_c), 'temperature, °C'], [`stations[${i}].reading.humidity_pct`, J(r.humidity_pct), 'humidity, %'],
      [`stations[${i}].reading.wind_kmh`, J(r.wind_kmh), 'wind, km/h'], [`stations[${i}].reading.wind_dir_id`, J(r.wind_dir_id), r.wind_dir_id === 0 ? 'no direction' : WIND_DIR_ID[r.wind_dir_id] ? `from ${WIND_DIR_ID[r.wind_dir_id]}` : 'not given'],
      [`stations[${i}].reading.rain_mm`, J(r.rain_mm), 'rain in the hour, mm'], [`stations[${i}].reading.pressure_hpa`, J(r.pressure_hpa), 'pressure, hPa']);
    else rows.push([`stations[${i}].reading`, 'null', 'no station in the file sent a reading for this hour']);
    rows.push(['distance', `${km} km`, 'computed here, not in the file']);
    if (f.reporting && f.reporting.station !== f.nearest.station) rows.push([`stations[${L.stations.indexOf(f.nearest.station)}].reading`, 'null', `the nearest, ${f.nearest.station.name} (${f.nearest.km} km, computed here), sent nothing`]);
    return { rows, record: s,
      fetch: `const o = await fetch('${API}/ipma-observations/latest.json').then(r => r.json());\n// Picked by distance from ${p.name}, not by a key: the join is findStation() in /assets/js/places.js.\nconst s = o.stations.find(x => x.name === ${JSON.stringify(s.name)});\nconsole.log(o.hour_utc, s.reading);`,
      curl: `# picked by distance (places.js findStation); selected here by its name\ncurl -s ${API}/ipma-observations/latest.json | jq '.hour_utc, (.stations[] | select(.name == ${JSON.stringify(s.name)}) | .reading)'` };
  },
  sea(p, L) {
    if (!Array.isArray(L.coasts)) throw new Error('shape');
    const f = findSea(p, L);
    if (!f) return { rows: [['coasts[]', 'no coast with a position', '']], record: null };
    const i = L.coasts.indexOf(f.coast);
    const rows = [[`coasts[${i}].name`, J(f.coast.name), f.near ? 'the nearest coastal point' : `the nearest coastal point, beyond ${SEA_NEAR_KM} km`], ['distance', `${f.km} km`, `computed here, not in the file; ${SEA_NEAR_KM} km is this site's choice`]];
    if (f.near) {
      const j = today0(f.coast.days), d = j >= 0 ? f.coast.days[j] : null;
      if (d) rows.push([`coasts[${i}].days[${j}].date`, J(d.date), 'the first day from today'], [`coasts[${i}].days[${j}].sea_min_m`, J(d.sea_min_m), 'total sea, lowest, m'], [`coasts[${i}].days[${j}].sea_max_m`, J(d.sea_max_m), 'total sea, highest, m'],
        [`coasts[${i}].days[${j}].waves_min_m`, J(d.waves_min_m), 'swell, lowest, m'], [`coasts[${i}].days[${j}].waves_max_m`, J(d.waves_max_m), 'swell, highest, m'],
        [`coasts[${i}].days[${j}].sea_temp_min_c`, J(d.sea_temp_min_c), 'sea temperature, lowest, °C'], [`coasts[${i}].days[${j}].sea_temp_max_c`, J(d.sea_temp_max_c), 'sea temperature, highest, °C']);
      else rows.push([`coasts[${i}].days[]`, 'no day from today', 'every day in the file is before today']);
    }
    return { rows, record: f.coast,
      fetch: `const c = await fetch('${API}/ipma-sea/latest.json').then(r => r.json());\n// Picked by distance from ${p.name} (${f.km} km), not by a key: the join is findSea() in /assets/js/places.js.\nconst coast = c.coasts.find(x => x.name === ${JSON.stringify(f.coast.name)});\nconsole.log(c.read_at, coast.days[0]);`,
      curl: `# picked by distance (places.js findSea); selected here by its name\ncurl -s ${API}/ipma-sea/latest.json | jq '.read_at, (.coasts[] | select(.name == ${JSON.stringify(f.coast.name)}) | .days[0])'` };
  },
  uv(p, L) {
    if (!Array.isArray(L.places)) throw new Error('shape');
    const f = findUV(p, L);
    if (!f) return { rows: [[`places[] where id == ${p.id}`, 'no entry', 'no UV for this town or a town near it']], record: null };
    const i = L.places.indexOf(f.uv), t = today();
    const rows = [[`places[${i}].id`, J(f.uv.id), f.exact ? `${p.name}, exact` : `${f.place.name}, ${f.km} km away (computed here): IPMA gives no UV for ${p.name}`]];
    const ents = (f.uv.days || []).map((d, j) => ({ d, j })).filter(x => x.d.date === t);
    if (ents.length) ents.forEach(({ d, j }) => { const b = uvBand(d.index); rows.push([`places[${i}].days[${j}].index`, J(d.index), `today${b ? `, ${b.name.toLowerCase()}` : ''}`]); });
    else rows.push([`places[${i}].days[] where date == "${t}"`, 'no entry', 'no UV for today']);
    return { rows, record: f.uv,
      fetch: `const u = await fetch('${API}/ipma-uv/latest.json').then(r => r.json());\nconst pl = u.places.find(x => x.id === ${f.uv.id}); // ${f.place.name}${f.exact ? '' : `, the nearest town with UV to ${p.name} (places.js findUV)`}\nconsole.log(u.read_at, pl.days.filter(d => d.date === '${t}'));`,
      curl: `curl -s ${API}/ipma-uv/latest.json | jq '.read_at, (.places[] | select(.id == ${f.uv.id}) | .days[] | select(.date == "${t}"))'` };
  },
  fire(p, L) {
    if (!dicoOf(p)) return { rows: [['municipalities[]', 'no record', 'IPMA publishes no fire risk class for the islands']], record: null };
    if (!Array.isArray(L.municipalities)) throw new Error('shape');
    const f = findFireRisk(p, L);
    if (!f) return { rows: [[`municipalities[] where dico == "${dicoOf(p)}"`, 'no record', 'no municipality matched']], record: null };
    const m = f.municipality, i = L.municipalities.indexOf(m), t = today();
    const rows = [[`municipalities[${i}].dico`, J(m.dico), f.exact ? `digits 2 to 5 of ${p.id}, exact` : `nearest municipality point, ${f.km} km (computed here)`]];
    (m.days || []).forEach((d, j) => { if (d.date >= t) rows.push([`municipalities[${i}].days[${j}].rcm`, J(d.rcm), `${d.date === t ? 'today' : d.date}: ${RCM_LEVELS[d.rcm] ? `class ${d.rcm}, ${RCM_LEVELS[d.rcm].name.toLowerCase()}` : 'no class'}`]); });
    return { rows, record: m,
      fetch: `const r = await fetch('${API}/ipma-fire-risk/latest.json').then(r => r.json());\nconst m = r.municipalities.find(x => x.dico === '${m.dico}'); // ${p.name}${f.exact ? '' : ', the nearest municipality point (places.js findFireRisk)'}\nconsole.log(r.read_at, m.days);`,
      curl: `curl -s ${API}/ipma-fire-risk/latest.json | jq '.read_at, (.municipalities[] | select(.dico == "${m.dico}") | .days)'` };
  },
};

function pathTable(key, rows) {
  return h('div', { class: 'table-wrap' }, h('table', { class: 'stack wb-paths' },
    h('caption', {}, `${TITLE[key]}: the path in ${BY_KEY[key].id}/latest.json, the value as read, and what it means`),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Path'), h('th', { scope: 'col' }, 'Value'), h('th', { scope: 'col' }, 'Meaning'))),
    h('tbody', {}, rows.map(([path, val, mean]) => h('tr', {}, h('th', { scope: 'row', class: 'wb-path' }, h('code', {}, path)),
      h('td', { 'data-label': 'Value', class: 'wb-val' }, h('code', {}, val)), h('td', { 'data-label': 'Meaning' }, mean || ''))))));
}

async function copy(text, msg, what) {
  await copyText(text, msg, { label: what });
  // copyText's own words are for a link; say what was copied here.
  if (msg.textContent === 'Link copied.') msg.textContent = `${what} copied.`;
  else if (msg.firstChild?.nodeType === 3) msg.firstChild.textContent = `Copying was refused; the ${what.toLowerCase()} is selected here: `;
}

function block(key) {
  const S = BY_KEY[key], src = res[key];
  const R = renderBlock(key, place, src, { slow: slow[key] });
  const kids = [h('h2', { id: `wb-h-${key}` }, `${TITLE[key]} · `, h('code', {}, S.id))];
  let b = null;
  if (src && src.latest.ok) { try { b = BUILD[key](place, src.latest.data); } catch { b = null; } }
  if (!b) kids.push(...R.body); // loading, slow, missing or a changed shape: renderBlock's own words
  else {
    kids.push(pathTable(key, b.rows));
    if (R.outcome?.how) kids.push(h('p', { class: 'wb-join' }, h('strong', {}, 'Join: '), R.outcome.how, '.'));
    if (b.fetch) {
      const msg = h('span', { class: 'wb-msg', role: 'status' });
      kids.push(h('div', { class: 'wb-copy' },
        h('button', { type: 'button', onclick: () => copy(b.fetch, msg, 'Fetch') }, 'Copy as fetch'),
        h('button', { type: 'button', onclick: () => copy(b.curl, msg, 'Curl and jq') }, 'Copy as curl and jq'), msg),
        h('details', { class: 'wb-snip' }, h('summary', {}, 'Show the two snippets'), h('pre', {}, h('code', {}, b.fetch)), h('pre', {}, h('code', {}, b.curl))));
    }
    if (b.record) {
      const lines = JSON.stringify(b.record, null, 2).split('\n');
      kids.push(h('details', { class: 'wb-rec' }, h('summary', {}, 'The whole record'),
        h('pre', {}, h('code', {}, lines.slice(0, MAX_LINES).join('\n'))),
        lines.length > MAX_LINES ? h('p', { class: 'note' }, `Cut at ${MAX_LINES} of ${lines.length} lines; the rest is in `, h('a', { href: urls(S.id).latest }, 'latest.json'), '.') : null));
    }
  }
  kids.push(R.prov);
  return h('section', { id: `wb-${key}`, class: `wb-block${R.mark ? ` wb-mark-${R.mark}` : ''}`, 'aria-labelledby': `wb-h-${key}` }, kids);
}

// ---------- the page ----------
function frame(p) {
  const area = areaOf(p);
  const h1 = h('h1', { id: 'wb-h1', tabindex: '-1' }, p.name);
  const sel = townSelect({ id: 'wb-town', selected: p.id });
  const form = h('form', { class: 'wb-pick', action: '/d/workbench/', method: 'get', onsubmit: e => {
    e.preventDefault();
    const q = placesFromURL(`?id=${sel.value}`, { fallback: [1110600] }).places[0];
    if (!q || q === place) return;
    setTown([q.id]); show(q, '', { focus: true });
  } }, h('label', { for: 'wb-town' }, 'Another town'), sel, h('button', { type: 'submit' }, 'Show'));
  const band = h('div', { class: 'wb-band' });
  const filesSum = h('summary', {}, 'The six files');
  const filesList = h('ul', { class: 'wb-files-list' });
  const files = h('details', { class: 'wb-files', open: wide.matches }, filesSum, h('h2', { class: 'wb-files-h' }, 'The six files'), filesList);
  const blocks = h('div', { class: 'wb-blocks' });
  const terms = h('div', { class: 'terms-body' });
  root.replaceChildren(
    unknownMsg ? h('p', { class: 'status warn', role: 'note' }, unknownMsg) : '',
    h('header', { class: 'wb-head' }, h1, h('p', { class: 'wb-sub' }, `Warning area ${area?.name || p.area} (${p.area}) · forecast place ${p.id} · position ${p.lat}, ${p.lon}`), form),
    band,
    h('div', { class: 'wb-layout' }, h('div', { class: 'wb-side' }, files),
      h('div', { class: 'wb-main' }, blocks,
        h('section', { class: 'wb-terms', 'aria-labelledby': 'terms' }, h('h2', { id: 'terms', tabindex: '-1' }, 'Terms'), terms))));
  return { h1, band, files, filesSum, filesList, blocks, terms };
}

function draw() {
  if (!place || !els) return;
  const { el } = statusBand(SOURCES.map(S => ({ id: S.id, name: TITLE[S.key], href: `#wb-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' });
  els.band.replaceChildren(el);
  const fp = filesPanel();
  els.filesSum.textContent = fp.summary;
  els.filesList.replaceChildren(...fp.rows);
  // Keep any details the reader opened.
  const open = new Set([...els.blocks.querySelectorAll('details[open]')].map(d => `${d.closest('section').id} ${d.className}`));
  els.blocks.replaceChildren(...SOURCES.map(S => block(S.key)));
  for (const d of els.blocks.querySelectorAll('details')) if (open.has(`${d.closest('section').id} ${d.className}`)) d.open = true;
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
wide.addEventListener('change', () => { if (els) els.files.open = wide.matches; });
addEventListener('popstate', () => fromURL({ focus: true }));
fromURL();
