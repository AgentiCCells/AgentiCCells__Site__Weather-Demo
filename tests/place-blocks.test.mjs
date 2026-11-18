// Tests for place-blocks.js: the pure parts the place card and the designs under /d/ share.
// Run: node --test tests/*.test.mjs. Fixtures: tests/fixtures/ipma-warnings.json (read 10:11 UTC)
// and ipma-city-forecasts.json (read 10:09 UTC), 18 November 2026. The clock is fixed where a
// function reads today's Lisbon date.
// Written by developer.weather-demo@AgentiCCells.dinis (instance C), 2026-11-18, round 2. Code Apache-2.0.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { placeById } from '../src/assets/js/places.js';
import {
  SOURCES, BY_KEY, RENDER, FAILED, placesFromURL, liveSpells, warningClause, forecastScale, townGroups, agedClause,
} from '../src/assets/js/place-blocks.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fx = name => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));
const warn = fx('ipma-warnings');
const fc = fx('ipma-city-forecasts');
const LISBOA = placeById(1110600), AVEIRO = placeById(1010500), BRAGA = placeById(1030300), PORTO = placeById(1131200);

test('the six sources and their renderers', () => {
  assert.deepEqual(SOURCES.map(s => s.key), ['warnings', 'forecasts', 'observations', 'sea', 'uv', 'fire']);
  for (const s of SOURCES) {
    assert.equal(BY_KEY[s.key], s);
    assert.equal(typeof RENDER[s.key], 'function');
    assert.match(FAILED[s.key], /not read\.$/);
  }
});

test('placesFromURL: one town, missing and unknown ids', () => {
  assert.deepEqual(placesFromURL('?id=1080500').places.map(p => p.id), [1080500]);
  const none = placesFromURL('');
  assert.deepEqual(none.places.map(p => p.id), [1110600]);
  assert.deepEqual(none.unknown, []);
  const bad = placesFromURL('?id=abc');
  assert.deepEqual(bad.places.map(p => p.id), [1110600]);
  assert.deepEqual(bad.unknown, ['abc']);
  assert.deepEqual(placesFromURL('?id=9999999').unknown, ['9999999']);
  // max 1: the first valid id wins and the rest are counted as cut
  const two = placesFromURL('?id=1080500,1131200');
  assert.deepEqual(two.places.map(p => p.id), [1080500]);
  assert.equal(two.cut, 1);
});

test('placesFromURL: two to three towns, commas and repeated id=, duplicates, top-up', () => {
  const opt = { min: 2, max: 3, fallback: [1110600, 1131200, 1080500] };
  assert.deepEqual(placesFromURL('?id=1080500,2310300', opt).places.map(p => p.id), [1080500, 2310300]);
  assert.deepEqual(placesFromURL('?id=1080500&id=2310300', opt).places.map(p => p.id), [1080500, 2310300]);
  const many = placesFromURL('?id=1080500,2310300,1040200,1131200', opt);
  assert.deepEqual(many.places.map(p => p.id), [1080500, 2310300, 1040200]);
  assert.equal(many.cut, 1);
  assert.deepEqual(placesFromURL('?id=1110600&id=1110600', opt).places.map(p => p.id), [1110600, 1131200]);
  assert.deepEqual(placesFromURL('?id=1131200', opt).places.map(p => p.id), [1131200, 1110600]);
  const mixed = placesFromURL('?id=x1,1080500', opt);
  assert.deepEqual(mixed.places.map(p => p.id), [1080500, 1110600]);
  assert.deepEqual(mixed.unknown, ['x1']);
  assert.deepEqual(placesFromURL('', opt).places.map(p => p.id), [1110600, 1131200]);
});

test('townGroups: the same order as the home page form', () => {
  const html = readFileSync('src/index.html', 'utf8');
  const home = [...html.matchAll(/<option value="(\d+)"/g)].map(m => Number(m[1]));
  const groups = townGroups();
  assert.deepEqual(groups.map(g => g.label), ['Mainland', 'Madeira', 'Azores']);
  assert.deepEqual(groups.flatMap(g => g.places.map(p => p.id)), home);
});

test('liveSpells: spells not yet ended, sorted by start, and the count ended', () => {
  const a = liveSpells(LISBOA, warn, '2026-11-18T13:00:00');
  assert.equal(a.live.length, 2);
  assert.equal(a.ended, 0);
  const b = liveSpells(LISBOA, warn, '2026-11-18T19:00:00');
  assert.deepEqual(b.live.map(w => w.type), ['rough sea']);
  assert.equal(b.ended, 1);
  const c = liveSpells(AVEIRO, warn, '2026-11-18T06:00:00');
  assert.deepEqual(c.live.map(w => w.level), ['yellow', 'orange']);
  assert.deepEqual(liveSpells(PORTO, warn, '2026-11-18T13:00:00'), { live: [], ended: 0 });
  assert.deepEqual(liveSpells(LISBOA, {}, '2026-11-18T13:00:00'), { live: [], ended: 0 });
});

test('warningClause: each type to its true end, and a higher level later', () => {
  const at = (p, now) => warningClause(liveSpells(p, warn, now).live, now);
  assert.equal(at(PORTO, '2026-11-18T13:00:00'), "No yellow, orange or red warning in IPMA's file.");
  assert.equal(at(AVEIRO, '2026-11-18T13:00:00'),
    'Warnings in force: yellow for rough sea until 18:00 today, then orange until Fri 20 Nov 00:00 (Portugal time).');
  assert.equal(at(AVEIRO, '2026-11-18T06:00:00'),
    'No warning in force now; later: orange for rough sea from 18:00 today to Fri 20 Nov 00:00 (Portugal time).');
  assert.equal(at(LISBOA, '2026-11-18T13:00:00'),
    'Warnings in force: yellow for rough sea until Thu 19 Nov 06:00; yellow for rain until 18:00 today (Portugal time).');
  assert.equal(at(BRAGA, '2026-11-18T19:00:00'), "No yellow, orange or red warning in IPMA's file.");
});

test('forecastScale: one scale over all places from today, or null', () => {
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-18T12:00:00Z') });
  try {
    const sc = forecastScale(fc);
    assert.equal(sc.lo, 10);
    assert.equal(sc.hi, 30);
    assert.equal(sc.pct(20), 50);
    assert.equal(forecastScale({}), null);
    mock.timers.setTime(Date.parse('2026-11-25T12:00:00Z'));
    assert.equal(forecastScale(fc), null, 'every day before today: no scale');
  } finally { mock.timers.reset(); }
});

test('agedClause: a clause from a stale or old file carries its age', () => {
  const src = readAt => ({ id: 'ipma-uv', latest: { ok: true, data: { read_at: readAt } } });
  const now = Date.now();
  assert.equal(agedClause('uv', 'UV 2.', src(new Date(now - 10 * 60000).toISOString())), 'UV 2.');
  assert.equal(agedClause('uv', 'UV 2.', src(new Date(now - 5 * 3600000).toISOString())), 'UV 2, from a UV file read 5 h ago (stale).');
  assert.equal(agedClause('sea', 'Sea at X: up to 2 m.', src(new Date(now - 30 * 3600000).toISOString())), 'Sea at X: up to 2 m, from a sea file read 30 h ago (old).');
  assert.equal(agedClause('uv', null, src('x')), null);
});
