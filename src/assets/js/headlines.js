// headlines.js: our own one-line headline from each source's latest.json, as on the home page.
// HEADLINES maps a source id to (data) => string, where data is that file's latest.json body as read.
// A function may throw on a file whose shape has changed: the caller catches it and says so.
// Nothing is guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance A), 2026-11-18, round 1, inside
// pages/home.js (team/rounds/1/design/PROPOSAL.md section 2.4); moved here unchanged by
// developer.weather-demo@AgentiCCells.dinis (instance D), 2026-11-18, round 2 (team/rounds/2/design/
// PROPOSAL.md section 1), so the home page and the Workbench design share them.

import { RCM_LEVELS, uvBand } from './codes.js';
import { currentWarnings, levelsFor, warningWindows, lisbonNow, fmtPT } from './map.js';

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const today = () => lisbonNow().slice(0, 10);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// index.json's headlines are not reused: its warnings line counts every area, not the areas with
// a warning (data notes, round 1).
export const HEADLINES = {
  'ipma-warnings': d => {
    const c = currentWarnings(d.active);
    if (!c.rows.length) return "No yellow, orange or red warning in IPMA's file for now or later.";
    const by = {}; for (const w of c.rows) by[w.level] = (by[w.level] || 0) + 1;
    const lv = ['yellow', 'orange', 'red'].filter(l => by[l]).map(l => `${by[l]} ${l}`);
    const nowN = Object.values(levelsFor(d.active, warningWindows()[0])).filter(x => x.level !== 'green').length;
    return `${lv.length > 1 ? lv.slice(0, -1).join(', ') + ' and ' + lv.at(-1) : lv[0]} warning${c.rows.length === 1 ? '' : 's'} in force or upcoming, in ${c.areas} of 25 areas; ${plural(nowN, 'area')} with one in force now.`;
  },
  'ipma-city-forecasts': d => {
    const cs = d.cities || [];
    const days = Math.max(0, ...cs.map(c => (c.days || []).filter(x => x.date >= today()).length));
    const run = cs.map(c => c.updated).filter(Boolean).sort().pop();
    return `${plural(cs.length, 'place')}, ${plural(days, 'day')} from today${run ? `; IPMA's run ${fmtPT(run)} (IPMA's time, as given)` : ''}.`;
  },
  'ipma-observations': d => {
    const st = d.stations || [];
    const rep = st.filter(s => s.reading);
    const hour = d.hour_utc ? `${d.hour_utc.slice(11, 16)} UTC` : 'an unknown hour';
    const t = rep.filter(s => isNum(s.reading.temp_c)).sort((a, b) => b.reading.temp_c - a.reading.temp_c);
    return `${rep.length} of ${st.length} stations sent a reading for ${hour}${t.length ? `; warmest ${t[0].name} ${t[0].reading.temp_c} °C, coolest ${t.at(-1).name} ${t.at(-1).reading.temp_c} °C` : '; none gave a temperature'}.`;
  },
  'ipma-fire-risk': d => {
    const ms = d.municipalities || [];
    const t = today();
    const cls = ms.map(m => (m.days || []).find(x => x.date === t)?.rcm).filter(c => RCM_LEVELS[c]);
    if (!cls.length) return `${ms.length} mainland municipalities, but no class for today (${t}) in the file.`;
    const by = {}; for (const c of cls) by[c] = (by[c] || 0) + 1;
    const keys = Object.keys(by).sort();
    if (keys.length === 1 && cls.length === ms.length) return `Today: all ${ms.length} mainland municipalities in class ${keys[0]} (${RCM_LEVELS[keys[0]].name.toLowerCase()}).`;
    return `Today, of ${ms.length} mainland municipalities: ${keys.map(k => `${by[k]} in class ${k} (${RCM_LEVELS[k].name.toLowerCase()})`).join(', ')}.`;
  },
  'ipma-sea': d => {
    const cs = d.coasts || [];
    const t = today();
    const vals = cs.map(c => ({ c, v: (c.days || []).find(x => x.date === t)?.sea_max_m })).filter(x => isNum(x.v));
    if (!vals.length) return `${plural(cs.length, 'coast')}; no total sea value for today.`;
    // Every coast at the highest value: named up to three, counted above that.
    const max = Math.max(...vals.map(x => x.v));
    const top = vals.filter(x => x.v === max);
    const where = top.length > 3 ? `${top.length} coasts` : top.map(x => x.c.name).join('; ');
    return `${plural(cs.length, 'coast')}; highest total sea today up to ${max} m (${where}).`;
  },
  'ipma-uv': d => {
    const t = today();
    // Only named places with a real id (never id 0, nor an id with no name such as 1081525).
    const vals = (d.places || []).filter(p => Number(p.id) > 0 && p.name).flatMap(p => (p.days || []).filter(x => x.date === t && isNum(x.index)).map(x => ({ p, v: x.index })));
    if (!vals.length) return `No UV value for today (${t}) in the file.`;
    const top = vals.sort((a, b) => b.v - a.v)[0];
    const b = uvBand(top.v);
    return `Highest UV today: ${top.v}${b ? ` (${b.name.toLowerCase()})` : ''}, ${top.p.name}.`;
  },
  'meteoalarm-pt': d => {
    const ms = d.messages || [];
    const n = ms.filter(m => Date.parse(m.expires_utc) > Date.now()).length;
    return `${n} of ${ms.length} messages not expired, as relayed from IPMA. The same warnings in English, not a second source.`;
  },
  'storm-charles-archive': d => {
    const c = d.counts || {};
    return `A fixed record of the Storm Charles site (10 to 12 November 2026): ${c.files ?? 'an unknown number of'} files, ${c.verified ?? 'an unknown number'} verified.`;
  },
};
