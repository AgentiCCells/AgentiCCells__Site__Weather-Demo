// places.js: the town picker's places, and the joins that put every weather source for a town
// side by side. ES module, no dependencies. Code Apache-2.0.
// Written by analyst.weather-demo@AgentiCCells.dinis, 2026-11-18, round 1.
// Notes (what each file holds, the joins, the failure states): team/rounds/1/data/NOTES.md.
//
// What is static here and what is read live:
// - Static (PLACES): each forecast place's name, IPMA globalIdLocal, position and warning area.
//   These are IPMA's identifiers, not weather values; they change only if IPMA changes its list.
// - Live (everything else): the warnings, forecast, observation, sea, UV and fire-risk values are
//   always taken from the latest.json files the page reads at run time. The functions below only
//   choose which record of a live file belongs to a place; they never hold or invent a value.
//
// Why not data.promptugal.news's by_place? index.json `by_place` (read 2026-11-18 16:21 UTC) lists
// 18 "now" files for Algarve places only (albufeira ... vila-real-de-santo-antonio, plus "algarve"),
// with no coordinates and no file for any place outside the Algarve. It covers 3 of the 35 places
// below (Faro, Loulé, Portimão; Sagres sits in the vila-do-bispo file). byPlaceFor() finds a place's
// file in the live index when there is one, so a page can link it, but the town view joins the
// sources itself from the per-source files, for every place, the same way.

import { AREAS } from './codes.js';

// ---------- the places ----------
// The 35 places of ipma-city-forecasts: every district capital, the island seats IPMA forecasts,
// and Guimarães, Sagres, Portimão, Loulé, Penhas Douradas and Sines.
// Source of id (IPMA globalIdLocal), name (as IPMA writes it), lat, lon and area (IPMA idAreaAviso):
// https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json `cities[]`, read 2026-11-18 at
// 16:21 UTC (file read_at 2026-11-18T16:11:56Z); the collector takes them from IPMA's
// https://api.ipma.pt/open-data/distrits-islands.json (`globalIdLocal`, `local`, `latitude`,
// `longitude`, `idAreaAviso`; checked against that file by analyst.ipma-data@ on 2026-11-18 at 10:55 UTC).
// kind: 'capital' (the 18 mainland district capitals), 'island' (Madeira and the Azores), 'town' (others).
// Tests check that every area exists in codes.js AREAS and agrees with the forecast fixture.
export const PLACES = [
  { id: 1010500, name: 'Aveiro', area: 'AVR', lat: 40.6413, lon: -8.6535, kind: 'capital' },
  { id: 1020500, name: 'Beja', area: 'BJA', lat: 38.02, lon: -7.87, kind: 'capital' },
  { id: 1030300, name: 'Braga', area: 'BRG', lat: 41.5475, lon: -8.4227, kind: 'capital' },
  { id: 1030800, name: 'Guimarães', area: 'BRG', lat: 41.4434, lon: -8.2938, kind: 'town' },
  { id: 1040200, name: 'Bragança', area: 'BGC', lat: 41.8076, lon: -6.7606, kind: 'capital' },
  { id: 1050200, name: 'Castelo Branco', area: 'CBO', lat: 39.8217, lon: -7.4957, kind: 'capital' },
  { id: 1060300, name: 'Coimbra', area: 'CBR', lat: 40.2081, lon: -8.4194, kind: 'capital' },
  { id: 1070500, name: 'Évora', area: 'EVR', lat: 38.5701, lon: -7.9104, kind: 'capital' },
  { id: 1080500, name: 'Faro', area: 'FAR', lat: 37.0146, lon: -7.9331, kind: 'capital' },
  { id: 1081505, name: 'Sagres', area: 'FAR', lat: 37.0168, lon: -8.9403, kind: 'town' },
  { id: 1081100, name: 'Portimão', area: 'FAR', lat: 37.15, lon: -8.52, kind: 'town' },
  { id: 1080800, name: 'Loulé', area: 'FAR', lat: 37.1397, lon: -8.0202, kind: 'town' },
  { id: 1090700, name: 'Guarda', area: 'GDA', lat: 40.5379, lon: -7.2647, kind: 'capital' },
  { id: 1090821, name: 'Penhas Douradas', area: 'GDA', lat: 40.4075, lon: -7.5665, kind: 'town' },
  { id: 1100900, name: 'Leiria', area: 'LRA', lat: 39.7473, lon: -8.8069, kind: 'capital' },
  { id: 1110600, name: 'Lisboa', area: 'LSB', lat: 38.766, lon: -9.1286, kind: 'capital' },
  { id: 1121400, name: 'Portalegre', area: 'PTG', lat: 39.29, lon: -7.42, kind: 'capital' },
  { id: 1131200, name: 'Porto', area: 'PTO', lat: 41.158, lon: -8.6294, kind: 'capital' },
  { id: 1141600, name: 'Santarém', area: 'STM', lat: 39.2, lon: -8.74, kind: 'capital' },
  { id: 1151200, name: 'Setúbal', area: 'STB', lat: 38.5246, lon: -8.8856, kind: 'capital' },
  { id: 1151300, name: 'Sines', area: 'STB', lat: 37.956, lon: -8.8643, kind: 'town' },
  { id: 1160900, name: 'Viana do Castelo', area: 'VCT', lat: 41.6952, lon: -8.8365, kind: 'capital' },
  { id: 1171400, name: 'Vila Real', area: 'VRL', lat: 41.3053, lon: -7.744, kind: 'capital' },
  { id: 1182300, name: 'Viseu', area: 'VIS', lat: 40.6585, lon: -7.912, kind: 'capital' },
  { id: 2310300, name: 'Funchal', area: 'MCS', lat: 32.6485, lon: -16.9084, kind: 'island' },
  { id: 2320100, name: 'Porto Santo', area: 'MPS', lat: 33.07, lon: -16.34, kind: 'island' },
  { id: 3410100, name: 'Vila do Porto', area: 'AOR', lat: 36.9563, lon: -25.1409, kind: 'island' },
  { id: 3420300, name: 'Ponta Delgada', area: 'AOR', lat: 37.7415, lon: -25.6677, kind: 'island' },
  { id: 3430100, name: 'Angra do Heroísmo', area: 'ACE', lat: 38.67, lon: -27.22, kind: 'island' },
  { id: 3440100, name: 'Santa Cruz da Graciosa', area: 'ACE', lat: 39.08, lon: -28, kind: 'island' },
  { id: 3450200, name: 'Velas', area: 'ACE', lat: 38.6842, lon: -28.2133, kind: 'island' },
  { id: 3460200, name: 'Madalena', area: 'ACE', lat: 38.5325, lon: -28.5237, kind: 'island' },
  { id: 3470100, name: 'Horta', area: 'ACE', lat: 38.5363, lon: -28.6315, kind: 'island' },
  { id: 3480200, name: 'Santa Cruz das Flores', area: 'AOC', lat: 39.45, lon: -31.13, kind: 'island' },
  { id: 3490100, name: 'Vila do Corvo', area: 'AOC', lat: 39.67, lon: -31.12, kind: 'island' },
];

export const placeById = id => PLACES.find(p => p.id === Number(id)) || null;
export const placeByName = name => PLACES.find(p => p.name.toLowerCase() === String(name ?? '').trim().toLowerCase()) || null;
export const areaOf = place => (place && AREAS[place.area]) || null;

// ---------- distance ----------
// Great-circle distance in km (haversine, mean Earth radius 6371.0088 km, IUGG).
export function haversineKm(a, b) {
  const R = 6371.0088, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const hasPos = x => x && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon));

// The nearest item to `from` among `items` (each with lat and lon). Items without a position are
// skipped. Options: filter(item) to keep only some. Returns { item, km } or null.
export function nearest(from, items, { filter } = {}) {
  if (!hasPos(from) || !Array.isArray(items)) return null;
  let best = null;
  for (const it of items) {
    if (!hasPos(it) || (filter && !filter(it))) continue;
    const km = haversineKm(from, { lat: Number(it.lat), lon: Number(it.lon) });
    if (!best || km < best.km) best = { item: it, km };
  }
  return best;
}

const km1 = km => Math.round(km * 10) / 10;

// ---------- the joins (each takes a latest.json body read live) ----------

// Forecast: by IPMA globalIdLocal, exact. forecasts: ipma-city-forecasts latest.json.
// Returns the city record (with days[]) or null.
export function findForecast(place, forecasts) {
  return (forecasts?.cities || []).find(c => Number(c.id) === place.id) || null;
}

// Warnings: every spell in ipma-warnings latest.json `active[]` for the place's warning area.
// An area with no entry has no yellow, orange or red spell in IPMA's file (green). Spells keep
// IPMA's Portugal local times with no zone; a spell whose end has passed is still in the list
// until IPMA reissues, so the page should compare `end` with the Lisbon time now.
export function findWarnings(place, warnings) {
  if (!warnings || !Array.isArray(warnings.active)) return null;
  return warnings.active.filter(a => a.area === place.area);
}

// Station: the nearest station in ipma-observations latest.json `stations[]`. The latest hour is
// always the emptiest (stations report late) and about 1 in 4 stations has `reading: null`
// (59 of 227 at the 16:13 UTC read), so this returns both the nearest station and the nearest one
// that has a reading, each with its distance. The page shows the reporting one and names the
// silent nearer one when they differ, rather than a blank.
// Returns { nearest: { station, km }, reporting: { station, km } | null } or null.
export function findStation(place, observations) {
  const all = observations?.stations;
  const n = nearest(place, all);
  if (!n) return null;
  const r = n.item.reading ? n : nearest(place, all, { filter: s => s.reading });
  return {
    nearest: { station: n.item, km: km1(n.km) },
    reporting: r ? { station: r.item, km: km1(r.km) } : null,
  };
}

// Sea: the nearest coastal point in ipma-sea latest.json `coasts[]` (12 points). For inland places
// the nearest point can be far away (Bragança: 172 km at the 16:13 UTC read), and for some islands
// it is on another island (Angra do Heroísmo: Horta coast, 109 km). `near` is false beyond nearKm.
// SEA_NEAR_KM = 25 is a proposal: every coastal place with its own sea point is within 24 km
// (Vila do Corvo 23.4 km, Ponta Delgada 23.2 km, Faro 20.7 km at the 16:13 UTC read); the next
// nearest (Setúbal, Coimbra) are about 40 km from theirs.
export const SEA_NEAR_KM = 25;
export function findSea(place, sea, { nearKm = SEA_NEAR_KM } = {}) {
  const n = nearest(place, sea?.coasts);
  return n ? { coast: n.item, km: km1(n.km), near: n.km <= nearKm } : null;
}

// UV: ipma-uv latest.json has no coordinates, only IPMA globalIdLocal ids. If the place's own id
// is in the file, that is the match (exact). Otherwise the nearest place of PLACES whose id is in
// the UV file (positions from PLACES). Ids the UV file holds that are not in PLACES (0, and
// 1081525 at the 16:13 UTC read) have no position and no name in any file read, so they are never
// matched. Returns { uv, place, km, exact } or null.
export function findUV(place, uv) {
  const list = (uv?.places || []).filter(p => Number(p.id) > 0);
  const own = list.find(p => Number(p.id) === place.id);
  if (own) return { uv: own, place, km: 0, exact: true };
  const ids = new Set(list.map(p => Number(p.id)));
  const n = nearest(place, PLACES, { filter: p => ids.has(p.id) && p.id !== place.id });
  if (!n) return null;
  return { uv: list.find(p => Number(p.id) === n.item.id), place: n.item, km: km1(n.km), exact: false };
}

// The municipality's DICO code for a mainland place, from its globalIdLocal: digits 2 to 5 of the
// 7-digit id are district and municipality (1 080 800 Loulé -> "0808"). Checked on 2026-11-18 at
// 16:21 UTC: for all 24 mainland places the code exists in ipma-fire-risk latest.json, and for 22
// the municipality's point there is the place's own position (Sagres 7.8 km and Penhas Douradas
// 2.4 km from theirs: villages, not seats). IPMA's API page says DICO follows CAOP (DGT).
// Madeira and the Azores (ids starting 2 or 3) have no fire-risk data, so null.
export function dicoOf(place) {
  const s = String(place?.id ?? '');
  return /^1\d{6}$/.test(s) ? s.slice(1, 5) : null;
}

// Fire risk: the municipality in ipma-fire-risk latest.json `municipalities[]` by DICO (exact);
// if that code is missing, the nearest municipality point, marked exact: false.
// Returns { municipality, km, exact } or null (islands, or file missing).
export function findFireRisk(place, fire) {
  const dico = dicoOf(place);
  const list = fire?.municipalities;
  if (!dico || !Array.isArray(list)) return null;
  const m = list.find(x => x.dico === dico);
  if (m) return { municipality: m, km: hasPos(m) ? km1(haversineKm(place, m)) : null, exact: true };
  const n = nearest(place, list);
  return n ? { municipality: n.item, km: km1(n.km), exact: false } : null;
}

// ---------- everything for one place ----------
// files: { warnings, forecasts, observations, fire, sea, uv }, each a latest.json body or null
// (a file that could not be read). Returns one entry per source: { source, read_at, value } where
// value is the join's result, or { source, read_at: null, value: null, missing: true } when the
// file was not read. A join can still be null with the file read (fire risk on the islands).
export function joinPlace(place, files = {}) {
  const part = (source, body, fn) => body
    ? { source, read_at: body.read_at || body.provenance?.read_at || null, value: fn(place, body) }
    : { source, read_at: null, value: null, missing: true };
  return {
    place,
    area: areaOf(place),
    warnings: part('ipma-warnings', files.warnings, findWarnings),
    forecast: part('ipma-city-forecasts', files.forecasts, findForecast),
    station: part('ipma-observations', files.observations, findStation),
    sea: part('ipma-sea', files.sea, findSea),
    uv: part('ipma-uv', files.uv, findUV),
    fire: part('ipma-fire-risk', files.fire, findFireRisk),
  };
}

// ---------- data.promptugal.news by-place files ----------
// A place's "now" file, if the live by-place index (index.json `by_place_index`,
// https://data.promptugal.news/api/v1/by-place/now/index.json) lists one: matched by the place's
// name without accents, lower case, spaces as hyphens ("Loulé" -> "loule"). index: that file's body.
// Returns the entry { id, name, url, read_at } or null. Read the notes before showing its values.
export const slug = name => String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function byPlaceFor(place, index) {
  const s = slug(place?.name);
  return (index?.places || []).find(p => p.id === s) || null;
}
