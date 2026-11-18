// Tests for codes.js and the pure functions of data.js. Run: node --test tests/
// Fixtures in tests/fixtures/ are small cuts of data.promptugal.news latest.json files read on
// 2026-11-18 at about 10:11 UTC (each names its read time). No card.json content is used.
// Written by analyst.ipma-data@AgentiCCells.dinis, 2026-11-18, round 1. Code Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AREAS, DICO_TO_AREA, areaForDico, WEATHER_TYPES, WIND_CLASS, RAIN_CLASS, WIND_DIR_ID,
  RCM_LEVELS, UV_BANDS, uvBand, WARNING_LEVELS, WARNING_TYPES,
} from '../src/assets/js/codes.js';
import { staleness, ageMinutes, STALE_MIN, OLD_MIN } from '../src/assets/js/data.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fx = name => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));

test('fixtures are small and hold nothing from a source card', () => {
  for (const f of readdirSync(dir)) {
    assert.ok(statSync(join(dir, f)).size < 3072, `${f} is under 3 KB`);
    const t = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/read_key|sgit_|"vault"/.test(t), `${f} carries no vault or key field`);
  }
});

test('AREAS has the 25 warning areas: 18 mainland, 4 Madeira, 3 Azores', () => {
  const codes = Object.keys(AREAS);
  assert.equal(codes.length, 25);
  const by = r => codes.filter(c => AREAS[c].region === r).length;
  assert.deepEqual([by('mainland'), by('madeira'), by('azores')], [18, 4, 3]);
  for (const c of codes) assert.ok(AREAS[c].name, `${c} has a name`);
});

test('DICO districts 01 to 18 each map to one mainland area', () => {
  const ds = Object.keys(DICO_TO_AREA).sort();
  assert.deepEqual(ds, Array.from({ length: 18 }, (_, i) => String(i + 1).padStart(2, '0')));
  assert.equal(new Set(Object.values(DICO_TO_AREA)).size, 18);
  assert.equal(DICO_TO_AREA['01'], 'AVR');
  assert.equal(DICO_TO_AREA['11'], 'LSB');
  assert.equal(DICO_TO_AREA['18'], 'VIS');
  assert.equal(areaForDico('9999'), null);
});

test('every area code in the fixtures is in AREAS', () => {
  const seen = new Set();
  for (const a of fx('ipma-warnings').active) seen.add(a.area);
  for (const c of fx('ipma-city-forecasts').cities) seen.add(c.area);
  for (const c of fx('ipma-sea').coasts) seen.add(c.area);
  for (const m of fx('ipma-fire-risk').municipalities) seen.add(areaForDico(m.dico));
  for (const a of seen) assert.ok(AREAS[a], `area ${a} is known`);
});

test('warning levels and types in the fixture are known', () => {
  for (const a of fx('ipma-warnings').active) {
    assert.ok(WARNING_LEVELS[a.level], `level ${a.level}`);
    assert.ok(WARNING_TYPES[a.type_pt], `type ${a.type_pt}`);
    assert.equal(WARNING_TYPES[a.type_pt].data, a.type, `English label for ${a.type_pt}`);
  }
});

test('every weather type, wind class and rain class in the forecast fixture is known', () => {
  for (const c of fx('ipma-city-forecasts').cities) for (const d of c.days) {
    assert.ok(WEATHER_TYPES[d.weather_type], `weather type ${d.weather_type}`);
    assert.ok(WIND_CLASS[d.wind_class], `wind class ${d.wind_class}`);
    if (d.rain_class !== null) assert.ok(d.rain_class in RAIN_CLASS, `rain class ${d.rain_class}`);
  }
});

test('every RCM level in the fire-risk fixture is known, with the file\'s own label', () => {
  for (const m of fx('ipma-fire-risk').municipalities) for (const d of m.days) {
    assert.ok(RCM_LEVELS[d.rcm], `rcm ${d.rcm}`);
    assert.equal(RCM_LEVELS[d.rcm].data, d.level);
  }
});

test('every wind_dir_id in the observations fixture is known', () => {
  for (const s of fx('ipma-observations').stations) if (s.reading) {
    assert.ok(s.reading.wind_dir_id in WIND_DIR_ID, `wind_dir_id ${s.reading.wind_dir_id}`);
  }
  assert.equal(WIND_DIR_ID[0], null);
  assert.equal(WIND_DIR_ID[9], 'N');
});

test('UV bands cover every index in the fixture and follow the WHO/IPMA thresholds', () => {
  for (const p of fx('ipma-uv').places) for (const d of p.days) assert.ok(uvBand(d.index), `uv ${d.index}`);
  assert.equal(uvBand(0.6).name, 'Low');
  assert.equal(uvBand(2.9).name, 'Low');
  assert.equal(uvBand(3).name, 'Moderate');
  assert.equal(uvBand(7.9).name, 'High');
  assert.equal(uvBand(10.5).name, 'Very high');
  assert.equal(uvBand(11).name, 'Extreme');
  assert.equal(uvBand(null), null);
  assert.equal(UV_BANDS.length, 5);
});

test('staleness: fresh, stale, old and unknown at the right ages', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const ago = m => new Date(now - m * 60000).toISOString();
  assert.equal(STALE_MIN, 180);
  assert.equal(OLD_MIN, 1440);
  assert.equal(ageMinutes(ago(42), now), 42);
  assert.equal(staleness(ago(0), now).level, 'fresh');
  assert.equal(staleness(ago(60), now).level, 'fresh');
  assert.equal(staleness(ago(180), now).level, 'fresh');
  assert.equal(staleness(ago(181), now).level, 'stale');
  assert.equal(staleness(ago(1440), now).level, 'stale');
  assert.equal(staleness(ago(1441), now).level, 'old');
  assert.equal(staleness(undefined, now).level, 'unknown');
  assert.equal(staleness('not a time', now).level, 'unknown');
});

test('staleness of the fixtures read at 10:11 UTC, seen from later the same day', () => {
  const readAt = fx('ipma-warnings').read_at;
  assert.equal(staleness(readAt, Date.parse('2026-11-18T11:00:00Z')).level, 'fresh');
  assert.equal(staleness(readAt, Date.parse('2026-11-18T16:00:00Z')).level, 'stale');
  assert.equal(staleness(readAt, Date.parse('2026-11-19T12:00:00Z')).level, 'old');
});
