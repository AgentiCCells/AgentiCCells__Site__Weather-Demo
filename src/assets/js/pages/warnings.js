// warnings.js: the Warnings page. The map, the timeline of warnings by area and type, the list
// with each warning's text, the collector's run strip, and MeteoAlarm's CAP feed as context.
// Read live from data.promptugal.news; nothing is guessed. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance A), 2026-11-18, round 1.
// Round 2 (instance D): the long list and MeteoAlarm's table fold on phones (review S7).
// Adapted from AgentiCCells/AgentiCCells__Site__IPMA-Data, src/assets/js/pages/warnings.js (commit
// 24e3d74), Apache-2.0, same organisation, by developer.weather-demo@AgentiCCells.dinis (instance B),
// 2026-11-18, round 1: the detail panel adds "Towns in this area" from places.js, each linking to
// /place/?id=<globalIdLocal> (design proposal 3.1). map.js is unchanged: the towns are added to the
// panel map.js draws, each time it redraws.

import { loadSource, ageBanner, provenance, loading, failure, runStrip, fmtUTC, fmtDay, h, s } from '../data.js';
import { warningsBlock, warningTable, currentWarnings, lisbonNow, areaName, ORDER, HATCH, swatch, lvl, levelWord, ensureHatches } from '../map.js';
import { AREAS } from '../codes.js';
import { PLACES } from '../places.js';

const IPMA_WARN = 'https://www.ipma.pt/en/otempo/prev-sam/';
const MA_PAGE = 'https://www.meteoalarm.org/en/live/region/PT';
const $ = id => document.getElementById(id);
const wide = () => matchMedia('(min-width: 760px)').matches;

// ---------- timeline ----------
// x is time, from the earlier of now and the first start to the last end. IPMA's times have no
// zone; now is Lisbon wall-clock time, so both are compared as the same naive clock.
function timeline(el, src) {
  const W0 = src.latest.data;
  const now = lisbonNow();
  const { rows: spells } = currentWarnings(W0.active, now);
  if (!spells.length) {
    el.replaceChildren(h('div', { class: 'panel' }, h('p', {}, "No yellow, orange or red warning in IPMA's file for now or later: every area is green.")), provenance(src));
    return;
  }
  ensureHatches();
  const rows = [];
  for (const a of ORDER) for (const type of [...new Set(spells.filter(w => w.area === a).map(w => w.type || w.type_pt))])
    rows.push({ a, type, items: spells.filter(w => w.area === a && (w.type || w.type_pt) === type) });
  const T = t => Date.parse(t + 'Z');
  const t0 = Math.min(T(now), ...spells.map(w => T(w.start))), t1 = Math.max(...spells.map(w => T(w.end)));
  const panel = h('div', { class: 'panel timeline' });
  const draw = () => {
    const W = Math.max(300, Math.round(panel.clientWidth - 32)), nar = W < 560, lab = nar ? 0 : 200, rh = nar ? 36 : 24, top = 32;
    const x = t => lab + (t - t0) / (t1 - t0) * (W - lab - 8);
    const H = top + rows.length * rh + 6;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
      'aria-label': `Timeline of ${spells.length} warnings in ${new Set(rows.map(r => r.a)).size} areas, from now to ${fmtDay(new Date(t1).toISOString().slice(0, 10))}, Portugal time. The same warnings are listed in the table below.` });
    for (let t = Math.ceil(t0 / 216e5) * 216e5; t <= t1; t += 216e5) {
      const iso = new Date(t).toISOString(); const X = x(t); const mid = iso.slice(11, 13) === '00';
      svg.append(s('line', { x1: X, x2: X, y1: top - 6, y2: H - 6, style: 'stroke:var(--line)', 'stroke-width': mid ? 1 : 0.5 }));
      if (X > W - (mid ? 70 : 34)) continue;
      if (mid) svg.append(s('text', { x: X + 3, y: 12, 'font-size': 12, class: 'ink' }, fmtDay(iso.slice(0, 10))));
      else if (!nar) svg.append(s('text', { x: X + 3, y: 25, 'font-size': 11 }, iso.slice(11, 16)));
    }
    const X = x(T(now));
    svg.append(s('line', { x1: X, x2: X, y1: top - 10, y2: H - 6, style: 'stroke:var(--ink)', 'stroke-width': 1.5 }), s('text', { x: X + 3, y: top - 2, 'font-size': 11, class: 'ink' }, 'now'));
    rows.forEach((r, i) => {
      const y = top + i * rh;
      svg.append(s('text', { x: 0, y: nar ? y + 10 : y + 16, 'font-size': nar ? 11.5 : 12, class: 'ink' }, `${areaName(r.a)}, ${r.type}`));
      const by = nar ? y + 15 : y + 6, bh = 13;
      r.items.forEach(w => {
        const a = x(T(w.start)), b = x(T(w.end)); const wd = Math.max(b - a - 2, 2);
        const g = s('g', {}, s('rect', { x: a + 1, y: by, width: wd, height: bh, rx: 3, style: `fill:var(--w-${w.level});stroke:var(--map-edge)`, 'stroke-width': 0.6 }),
          ...HATCH[w.level].map(p => s('rect', { x: a + 1, y: by, width: wd, height: bh, rx: 3, style: `fill:url(#${p})` })),
          s('title', {}, `${areaName(r.a)}: ${w.level} ${r.type}, ${w.start.replace('T', ' ').slice(0, 16)} to ${w.end.replace('T', ' ').slice(0, 16)} Portugal time`));
        svg.append(g);
      });
    });
    panel.replaceChildren(svg, h('ul', { class: 'legend' }, ['yellow', 'orange', 'red'].map(l => h('li', {}, swatch(l), levelWord(l)))),
      h('p', { class: 'note' }, `Bars run from IPMA's start to end time. A small gap between bars marks where one warning ends and the next begins. The line marked now is the time now (${now.slice(11, 16)} in Portugal).`));
  };
  el.replaceChildren(panel, provenance(src));
  draw();
  let lastW = panel.clientWidth;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (Math.abs(panel.clientWidth - lastW) > 30) { lastW = panel.clientWidth; draw(); } }).observe(panel);
}

// ---------- towns in the selected area ----------
// map.js redraws the detail panel on every selection and time change, starting with an <h3> that
// holds the area's name. After each redraw, add the forecast places of that area from PLACES (IPMA's
// own place-to-area join, from ipma-city-forecasts). Areas with no place say so.
const codeByName = Object.fromEntries(Object.entries(AREAS).map(([c, a]) => [a.name, c]));
function townsInPanel(block) {
  const panel = block.querySelector('.detail');
  if (!panel) return;
  const add = () => {
    if (panel.querySelector('.towns')) return;
    const code = codeByName[panel.querySelector('h3')?.textContent?.trim()];
    if (!code) return;
    const towns = PLACES.filter(p => p.area === code);
    panel.append(h('div', { class: 'towns' }, h('h4', {}, 'Towns in this area'),
      towns.length
        ? h('ul', { class: 'town-list' }, towns.map(p => h('li', {}, h('a', { href: `/place/?id=${p.id}` }, p.name))))
        : h('p', { class: 'muted' }, 'No forecast place in this area: IPMA forecasts no town here.')));
  };
  new MutationObserver(add).observe(panel, { childList: true });
  add();
}

// ---------- MeteoAlarm ----------
function meteoalarm(el, src, ipmaCount) {
  const M = src.latest.data;
  const now = Date.now();
  const msgs = (M.messages || []).filter(m => Date.parse(m.expires_utc) > now)
    .sort((a, b) => String(a.area).localeCompare(String(b.area), 'pt') || String(a.onset_utc).localeCompare(String(b.onset_utc)));
  const t = iso => (iso && !isNaN(Date.parse(iso))) ? fmtUTC(iso).replace(/^(\d+ \w+) \d{4},/, '$1') : 'not given';
  const at = M.attribution || {};
  const body = msgs.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'stack' },
      h('caption', {}, `${msgs.length} of ${(M.messages || []).length} CAP messages in the feed have not expired; expired ones are not listed. Times UTC.`),
      h('thead', {}, h('tr', {}, ['Area', 'Level', 'Event', 'Onset', 'Expires', 'Issued'].map(x => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, msgs.map(m => h('tr', {},
        h('th', { scope: 'row' }, m.area || 'not given'),
        h('td', { 'data-label': 'Level' }, ['yellow', 'orange', 'red'].includes(m.level) ? lvl(m.level) : (m.level || 'not given')),
        h('td', { 'data-label': 'Event' }, m.event || m.hazard || 'not given'),
        h('td', { 'data-label': 'Onset' }, t(m.onset_utc)),
        h('td', { 'data-label': 'Expires' }, t(m.expires_utc)),
        h('td', { 'data-label': 'Issued' }, t(m.sent_utc)))))))
    : h('p', {}, 'No CAP message in MeteoAlarm\'s feed is in force or upcoming now.');
  el.replaceChildren(...[ageBanner(src.latest, { subject: "MeteoAlarm's messages", page: MA_PAGE, pageLabel: 'meteoalarm.org' }), h('div', { class: 'panel' },
    h('p', {}, `MeteoAlarm: ${msgs.length} message${msgs.length === 1 ? '' : 's'} not expired now. IPMA's file: ${ipmaCount === null ? 'could not be read' : `${ipmaCount} warning${ipmaCount === 1 ? '' : 's'} in force or upcoming`}. The two are counted differently (a CAP message can be an update of another), so they are not matched one by one.`),
    msgs.length ? h('details', { class: 'fold', open: wide() }, h('summary', {}, `Show the ${msgs.length} message${msgs.length === 1 ? '' : 's'}`, ' ', h('span', { class: 'muted' }, '(area, level, event, onset, expires, issued)')), body) : body,
    h('p', { class: 'note' }, h('strong', {}, 'National service: '), at.national_service || 'IPMA, Instituto Português do Mar e da Atmosfera', '. ',
      'Via ', h('a', { href: 'https://www.meteoalarm.org/' }, 'www.meteoalarm.org'), '. Each message keeps its time of issue.'),
    h('p', { class: 'note' }, h('strong', {}, "MeteoAlarm's disclaimer: "), at.disclaimer || h('em', {}, 'the disclaimer was not in the file; see www.meteoalarm.org.'))),
  provenance(src, { pageLabel: 'MeteoAlarm page' })].filter(Boolean));
}

async function main() {
  const block = $('warnings-block'), tl = $('timeline'), list = $('list'), runs = $('runs'), ma = $('meteoalarm');
  const slows = [loading(block, "IPMA's warnings"), loading(tl, "IPMA's warnings"), loading(list, "IPMA's warnings")];
  const slowR = loading(runs, "the collector's log"), slowM = loading(ma, "MeteoAlarm's feed");
  const pW = loadSource('ipma-warnings', { reads: true, onSlow: () => { slows.forEach(f => f()); slowR(); } });
  const pF = loadSource('ipma-fire-risk');
  const pM = loadSource('meteoalarm-pt', { onSlow: slowM });
  const [W, F] = await Promise.all([pW, pF]);
  let ipmaCount = null;
  if (!W.latest.ok) {
    for (const e of [block, tl, list]) failure(e, "IPMA's warnings", W.latest, IPMA_WARN);
  } else {
    warningsBlock(block, W, F, { tableId: 'list-h' });
    townsInPanel(block);
    timeline(tl, W);
    ipmaCount = currentWarnings(W.latest.data.active).rows.length;
    // Review S7: at 390 px the stacked list with IPMA's text made this page about 17,000 px tall.
    // It is folded on phones (open from 760 px up); the map's skip link opens it.
    const fold = h('details', { class: 'fold', open: wide() },
      h('summary', {}, ipmaCount ? `Show the ${ipmaCount} warning${ipmaCount === 1 ? '' : 's'} with IPMA's text` : 'Show the list', ' ', h('span', { class: 'muted' }, '(area, level, type, times, text in Portuguese)')),
      h('div', { class: 'panel' }, warningTable(W.latest.data.active, { withText: true })));
    list.replaceChildren(fold, provenance(W));
    block.querySelector('.skiplink')?.addEventListener('click', () => { fold.open = true; });
  }
  runs.replaceChildren(h('div', { class: 'panel' }, runStrip(W.reads)));
  const M = await pM;
  if (!M.latest.ok) failure(ma, "MeteoAlarm's feed", M.latest, MA_PAGE, { pageLabel: 'See MeteoAlarm directly:' });
  else meteoalarm(ma, M, ipmaCount);
}
main().catch(e => {
  for (const id of ['warnings-block', 'timeline', 'list']) { const el = $(id); if (el) failure(el, "IPMA's warnings", { error: `the page could not draw the file (${e.message})` }, IPMA_WARN); }
});
