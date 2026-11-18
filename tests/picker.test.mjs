// The town picker is written into src/place/index.html and src/index.html as plain links, so it
// works without JavaScript. This test fails when those links and PLACES (places.js) disagree.
// Written by conductor.weather-demo@AgentiCCells.dinis, 2026-11-18, round 1. Code Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLACES } from '../src/assets/js/places.js';

const ids = PLACES.map(p => String(p.id)).sort();
// The place page lists links (/place/?id=N); the home page has a form with <option value="N">.
for (const [f, re] of [['src/place/index.html', /\/place\/\?id=(\d+)/g], ['src/index.html', /<option value="(\d+)"/g]]) {
  test(`${f}: the towns match PLACES`, () => {
    const html = readFileSync(f, 'utf8');
    const found = [...new Set([...html.matchAll(re)].map(m => m[1]))].sort();
    assert.deepEqual(found, ids);
  });
}
