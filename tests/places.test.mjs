// Tests for places.js: the place table and the joins. Run: node --test tests/*.test.mjs
// Fixtures: tests/fixtures/places-algarve.json (cut from latest.json files read 2026-11-18 at
// 16:21 UTC) and the island stations and sea points in the round 1 fixtures (read about 10:11 UTC).
// Written by analyst.weather-demo@AgentiCCells.dinis, 2026-11-18, round 1. Code Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS } from '../src/assets/js/codes.js';
import {
  PLACES, placeById, placeByName, haversineKm, nearest, findForecast, findWarnings, findStation,
  findSea, findUV, dicoOf, findFireRisk, joinPlace, slug, byPlaceFor, SEA_NEAR_KM,
} from '../src/assets/js/places.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fx = name => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));
const alg = fx('places-algarve');

test('the place table: 35 places, unique ids and names, positions in Portugal', () => {
  assert.equal(PLACES.length, 35);
  assert.equal(new Set(PLACES.map(p => p.id)).size, 35);
  assert.equal(new Set(PLACES.map(p => p.name)).size, 35);
  assert.equal(PLACES.filter(p => p.kind === 'capital').length, 18);
  for (const p of PLACES) {
    assert.match(String(p.id), /^[123]\d{6}$/, `${p.name} id`);
    assert.ok(p.lat > 32 && p.lat < 42.2 && p.lon > -31.3 && p.lon < -6.1, `${p.name} position`);
  }
  for (const n of ['Loulé', 'Portimão', 'Sagres', 'Funchal', 'Ponta Delgada']) assert.ok(placeByName(n), n);
  assert.equal(placeById(1080800).name, 'Loulé');
});

test('every place has a warning area that exists in codes.js AREAS, in the right region', () => {
  for (const p of PLACES) {
    assert.ok(AREAS[p.area], `${p.name}: area ${p.area}`);
    const region = { 1: 'mainland', 2: 'madeira', 3: 'azores' }[String(p.id)[0]];
    assert.equal(AREAS[p.area].region, region, `${p.name} region`);
  }
});

test('the static areas and positions agree with the forecast files', () => {
  for (const c of [...fx('ipma-city-forecasts').cities, ...alg.forecasts.cities]) {
    const p = placeById(c.id);
    assert.ok(p, `place ${c.id}`);
    assert.equal(p.name, c.name);
    assert.equal(p.area, c.area, `${c.name} area`);
    assert.equal(p.lat, c.lat); assert.equal(p.lon, c.lon);
    assert.equal(findForecast(p, alg.forecasts)?.id ?? findForecast(p, fx('ipma-city-forecasts')).id, c.id);
  }
});

test('haversine distance', () => {
  assert.equal(haversineKm({ lat: 38, lon: -9 }, { lat: 38, lon: -9 }), 0);
  // One degree of latitude is about 111.2 km on a sphere of radius 6371 km.
  assert.ok(Math.abs(haversineKm({ lat: 38, lon: -9 }, { lat: 39, lon: -9 }) - 111.2) < 0.1);
  // Lisboa to Porto (forecast positions): about 269 km.
  const d = haversineKm(placeByName('Lisboa'), placeByName('Porto'));
  assert.ok(d > 268 && d < 271, `Lisboa-Porto ${d}`);
});

test('nearest(): skips items without a position, honours the filter, empty input gives null', () => {
  const items = [{ id: 'a', lat: null, lon: null }, { id: 'b', lat: 37.2, lon: -8 }, { id: 'c', lat: 37.0, lon: -7.9 }];
  assert.equal(nearest({ lat: 37.01, lon: -7.93 }, items).item.id, 'c');
  assert.equal(nearest({ lat: 37.01, lon: -7.93 }, items, { filter: x => x.id !== 'c' }).item.id, 'b');
  assert.equal(nearest({ lat: 37, lon: -8 }, []), null);
  assert.equal(nearest({ lat: 37, lon: -8 }, undefined), null);
});

test('nearest station: the reporting one when the nearest is silent (Portimão, 16:13 UTC read)', () => {
  const r = findStation(placeByName('Portimão'), alg.observations);
  assert.equal(r.nearest.station.id, 6210879); // Praia da Rocha, reading null
  assert.equal(r.nearest.station.reading, null);
  assert.equal(r.reporting.station.id, 1210878); // Portimão (Aeródromo)
  assert.ok(r.reporting.km > r.nearest.km);
  const f = findStation(placeByName('Faro'), alg.observations);
  assert.equal(f.nearest.station.id, 1200554);
  assert.deepEqual(f.reporting, f.nearest);
  assert.equal(findStation(placeByName('Sagres'), alg.observations).nearest.station.id, 1200533);
});

test('nearest station on the islands (round 1 fixture)', () => {
  const obs = fx('ipma-observations');
  assert.equal(findStation(placeByName('Santa Cruz das Flores'), obs).nearest.station.id, 1200501);
  assert.equal(findStation(placeByName('Vila do Porto'), obs).nearest.station.id, 1200515);
  assert.equal(findStation(placeByName('Funchal'), obs).nearest.station.id, 1200522);
  assert.equal(findStation(placeByName('Porto Santo'), obs).nearest.station.id, 1200524);
  assert.equal(findStation(placeByName('Horta'), obs).nearest.station.id, 1200505);
  assert.equal(findStation(placeByName('Lisboa'), null), null);
});

test('nearest sea point, and "near" only within SEA_NEAR_KM', () => {
  assert.equal(findSea(placeByName('Loulé'), alg.sea).coast.id, 1080526);
  assert.equal(findSea(placeByName('Sagres'), alg.sea).coast.id, 1081526);
  assert.equal(findSea(placeByName('Portimão'), alg.sea).coast.id, 1081526);
  const sea = fx('ipma-sea');
  const ps = findSea(placeByName('Porto Santo'), sea);
  assert.equal(ps.coast.id, 2320126); assert.equal(ps.near, true);
  assert.equal(findSea(placeByName('Lisboa'), sea).coast.id, 1111026);
  const bgc = findSea(placeByName('Bragança'), sea);
  assert.ok(bgc.km > SEA_NEAR_KM); assert.equal(bgc.near, false);
  assert.equal(findSea(placeByName('Faro'), null), null);
});

test('UV: exact by id, else the nearest place in the UV file; never place 0 or an unnamed id', () => {
  const faro = findUV(placeByName('Faro'), alg.uv);
  assert.equal(faro.exact, true); assert.equal(faro.uv.id, 1080500);
  const loule = findUV(placeByName('Loulé'), alg.uv);
  assert.equal(loule.exact, false); assert.equal(loule.uv.id, 1080500); assert.ok(loule.km > 10 && loule.km < 20);
  const sagres = findUV(placeByName('Sagres'), alg.uv);
  assert.equal(sagres.uv.id, 1080500, 'not 1081525, which no file names or places');
  const flores = findUV(placeByName('Vila do Corvo'), fx('ipma-uv'));
  assert.equal(flores.uv.id, 3480200);
});

test('fire risk: DICO from globalIdLocal, exact match, islands null', () => {
  assert.equal(dicoOf(placeByName('Loulé')), '0808');
  assert.equal(dicoOf(placeByName('Lisboa')), '1106');
  assert.equal(dicoOf(placeByName('Funchal')), null);
  for (const [n, d] of [['Faro', '0805'], ['Loulé', '0808'], ['Portimão', '0811'], ['Sagres', '0815']]) {
    const r = findFireRisk(placeByName(n), alg.fire);
    assert.equal(r.exact, true); assert.equal(r.municipality.dico, d);
  }
  for (const p of PLACES.filter(x => x.kind !== 'island')) assert.ok(dicoOf(p), `${p.name} has a DICO`);
  assert.equal(findFireRisk(placeByName('Horta'), alg.fire), null);
  // A DICO not in the file falls back to the nearest point, marked not exact.
  const r = findFireRisk(placeByName('Lisboa'), fx('ipma-fire-risk'));
  assert.equal(r.municipality.dico, '1106');
  const nx = findFireRisk(placeByName('Beja'), fx('ipma-fire-risk'));
  assert.equal(nx.exact, false);
});

test('joinPlace: every source with its read time; a missing file is marked, not filled', () => {
  const p = placeByName('Faro');
  const j = joinPlace(p, { warnings: fx('ipma-warnings'), forecasts: alg.forecasts, observations: alg.observations, sea: alg.sea, uv: alg.uv, fire: null });
  assert.equal(j.area.name, 'Faro');
  assert.ok(Array.isArray(j.warnings.value));
  for (const a of j.warnings.value) assert.equal(a.area, 'FAR');
  assert.equal(j.forecast.value.id, 1080500);
  assert.equal(j.station.read_at, '2026-11-18T16:13:32Z');
  assert.equal(j.fire.missing, true); assert.equal(j.fire.value, null);
  assert.deepEqual(findWarnings(placeByName('Horta'), fx('ipma-warnings')), []);
  assert.equal(findWarnings(p, null), null);
});

test('by-place slug and lookup in a by-place index', () => {
  assert.equal(slug('Loulé'), 'loule');
  assert.equal(slug('Vila Real de Santo António'), 'vila-real-de-santo-antonio');
  const index = { places: [{ id: 'loule', url: 'https://data.promptugal.news/api/v1/by-place/now/loule.json' }] };
  assert.equal(byPlaceFor(placeByName('Loulé'), index).id, 'loule');
  assert.equal(byPlaceFor(placeByName('Porto'), index), null);
  assert.equal(byPlaceFor(placeByName('Porto'), null), null);
});
