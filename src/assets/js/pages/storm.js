// pages/storm.js: the live part of /storm-charles/ (#storm-live). Reads the archive's manifest,
// storm-charles-archive latest.json on data.promptugal.news, and draws: a badge with the archive's
// fixed date (never an age: the archive is meant to be fixed, so no stale check is run), the files
// by group on one byte scale, a timeline of the dated files, and the file list with each file's
// checksum state and a link to it on the storm site. reads.json answers 404 for this source, so
// there is no run strip. Nothing is fetched from any other host: the storm site's own files are
// linked, not read. Every count comes from the file. ES module, no dependencies beyond data.js.
// Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance B), 2026-11-18, round 1, from the
// design proposal (team/rounds/1/design/PROPOSAL.md, section 3.7) and the analyst's notes.

import { loadSource, urls, loading, failure, fmtUTC, fmtDay, h, s } from '../data.js';

const ID = 'storm-charles-archive';
const WHAT = 'the Storm Charles archive (storm-charles-archive)';
const STORM_SITE = 'https://storm-charles.promptugal.news/';
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const kB = b => Number.isFinite(b) ? `${(b / 1024).toLocaleString('en-GB', { maximumFractionDigits: b < 10240 ? 1 : 0 })} kB` : 'size not given';
const MB = b => `${(b / 1e6).toLocaleString('en-GB', { maximumFractionDigits: 1 })} MB`;
const group = f => String(f.dataset || f.path || '').split('/')[0] || 'other';
// "17 Nov 2026, 19:27 UTC" without the year when it is the archive's own year.
const when = iso => fmtUTC(iso);

// ---------- the dated files: date (and hour) from the path ----------
// flights/frames/lisbon/2026-11-12/08.json -> series flights/frames/lisbon, day 2026-11-12, hour 08
// flights/wind/lisbon-2026-11-10.json      -> series flights/wind/lisbon, day 2026-11-10, no hour
function dated(files) {
  const out = [];
  for (const f of files) {
    const p = String(f.path || '');
    let m = /^(.*)\/(\d{4}-\d\d-\d\d)\/(\d\d)\.json$/.exec(p);
    if (m) { out.push({ f, series: m[1], day: m[2], hour: Number(m[3]) }); continue; }
    m = /^(.*?)-?(\d{4}-\d\d-\d\d)\.json$/.exec(p);
    if (m) out.push({ f, series: m[1].replace(/[-/]$/, ''), day: m[2], hour: null });
  }
  return out;
}

function timeline(el, files, L) {
  const D = dated(files);
  if (!D.length) { put(el, h('p', { class: 'status' }, 'No file in the archive carries a date in its path, so there is no timeline to draw.')); return; }
  const series = [...new Set(D.map(d => d.series))].sort();
  const days = [...new Set(D.map(d => d.day))].sort();
  const T = (day, hour = 0) => Date.parse(`${day}T00:00:00Z`) + hour * 3600e3;
  const t0 = T(days[0]), t1 = T(days[days.length - 1]) + 864e5;
  const built = L.catalogue?.built_at, archived = L.read_at;
  const box = h('div', { class: 'panel timeline storm-tl' });
  const list = h('div', { id: 'storm-tl-list' });
  const draw = () => {
    const W = Math.max(300, Math.round(box.clientWidth - 32));
    if (W < 528) { put(box, h('p', { class: 'note' }, 'On a narrow screen the timeline is shown as the list below.')); return; }
    const lab = 190, rh = 22, top = 30, after = 150;
    const x = t => lab + (t - t0) / (t1 - t0) * (W - lab - after);
    const H = top + series.length * rh + 10;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true', focusable: 'false' });
    for (let t = t0; t <= t1; t += 864e5) {
      const X = x(t);
      svg.append(s('line', { x1: X, x2: X, y1: top - 8, y2: H - 6, style: 'stroke:var(--line)', 'stroke-width': 1 }));
      if (t < t1) svg.append(s('text', { x: X + 3, y: 12, 'font-size': 12, class: 'ink' }, fmtDay(new Date(t).toISOString().slice(0, 10))));
    }
    series.forEach((sr, i) => {
      const y = top + i * rh;
      svg.append(s('text', { x: 0, y: y + 14, 'font-size': 11.5, class: 'ink' }, sr));
      for (const d of D.filter(z => z.series === sr)) {
        if (d.hour === null) svg.append(s('rect', { x: x(T(d.day)) + 1, y: y + 5, width: Math.max(2, x(T(d.day) + 864e5) - x(T(d.day)) - 2), height: 10, rx: 3, style: 'fill:var(--muted);opacity:.55' }));
        else svg.append(s('rect', { x: x(T(d.day, d.hour)), y: y + 3, width: 2, height: 14, style: `fill:${d.f.verified === false ? 'var(--old)' : 'var(--ink)'}` }));
      }
    });
    // After a break mark, the two dates that are not file dates: the catalogue and the archive.
    const bx = W - after + 14;
    svg.append(s('path', { d: `M${bx} ${top - 8} l6 ${(H - top) / 2} l-6 ${(H - top) / 2}`, style: 'fill:none;stroke:var(--muted)', 'stroke-width': 1 }));
    if (built) svg.append(s('text', { x: bx + 14, y: top + 12, 'font-size': 11.5 }, `catalogue built ${fmtDay(built.slice(0, 10)).slice(4)}`));
    if (archived) svg.append(s('text', { x: bx + 14, y: top + 30, 'font-size': 11.5 }, `archived ${fmtDay(archived.slice(0, 10)).slice(4)}`));
    put(box, svg, h('p', { class: 'note' }, `Each row is a set of files whose path holds a date: a thin mark for a file per hour (the hour as written in its path), a wide bar for a file per day. ${days.length} days, ${fmtDay(days[0])} to ${fmtDay(days[days.length - 1])}. `,
      h('a', { href: '#storm-tl-list' }, 'Timeline as a list'), '.'));
  };
  // The list: the same facts, the accessible form at every width.
  put(list, h('ul', { class: 'storm-series' }, series.map(sr => {
    const z = D.filter(d => d.series === sr).sort((a, b) => T(a.day, a.hour ?? 0) - T(b.day, b.hour ?? 0));
    const hourly = z.every(d => d.hour !== null);
    const first = z[0], last = z[z.length - 1];
    const span = hourly ? `${fmtDay(first.day)} ${String(first.hour).padStart(2, '0')}:00 to ${fmtDay(last.day)} ${String(last.hour).padStart(2, '0')}:00`
      : `${fmtDay(first.day)} to ${fmtDay(last.day)}`;
    return h('li', {}, h('code', {}, sr), `: ${z.length} file${z.length === 1 ? '' : 's'}, ${hourly ? 'one per hour' : 'one per day'}, ${span}`);
  })), h('p', { class: 'note' }, `Hours are as written in each file's path. The storm site's catalogue was built ${built ? when(built) : 'at a time the file does not give'}; the archive read it on ${archived ? when(archived) : 'a date the file does not give'}.`));
  put(el, box, list);
  draw();
  let lastW = box.clientWidth;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (Math.abs(box.clientWidth - lastW) > 30) { lastW = box.clientWidth; draw(); } }).observe(box);
}

// ---------- files by group, one byte scale ----------
function groups(files) {
  const by = new Map();
  for (const f of files) {
    const g = group(f);
    const G = by.get(g) || { name: g, files: [], bytes: 0 };
    G.files.push(f); G.bytes += Number(f.bytes) || 0; by.set(g, G);
  }
  return [...by.values()].sort((a, b) => b.bytes - a.bytes);
}
function barChart(G, counts) {
  const max = Math.max(1, ...G.map(g => g.bytes));
  return h('figure', { class: 'chart' },
    h('ul', { class: 'bars storm-bars' }, G.map(g => h('li', {},
      h('span', { class: 'lab' }, g.name),
      h('span', { 'aria-hidden': 'true' }, h('span', { class: 'b', style: `width:${g.bytes / max * 100}%` })),
      h('span', { class: 'num' }, `${g.files.length} file${g.files.length === 1 ? '' : 's'}, ${kB(g.bytes)}`)))),
    h('figcaption', {}, `${counts.files ?? 'An unknown number of'} files${Number.isFinite(counts.bytes) ? `, ${MB(counts.bytes)}` : ''}${Number.isFinite(counts.datasets) ? ` in ${counts.datasets} datasets` : ''}; ${counts.verified ?? 'an unknown number'} verified (the sha256 of the bytes received matched the storm site's catalogue). Bars: bytes per group, on one scale; the groups are the first part of each dataset's name.`));
}

// ---------- the file list ----------
function fileList(G) {
  return G.map(g => {
    const files = g.files.slice().sort((a, b) => (a.verified === false ? 0 : 1) - (b.verified === false ? 0 : 1) || String(a.path).localeCompare(String(b.path)));
    const bad = files.filter(f => f.verified !== true).length;
    return h('details', { class: 'storm-group', open: g.name === 'weather' ? true : null },
      h('summary', {}, `${g.name}: ${files.length} file${files.length === 1 ? '' : 's'}, ${kB(g.bytes)}`, bad ? h('span', { class: 'muted' }, ` (${bad} not verified)`) : null),
      h('ul', { class: 'storm-files' }, files.map(f => h('li', {},
        f.url ? h('a', { href: f.url }, h('code', {}, f.path)) : h('code', {}, f.path || 'no path'),
        ` · ${kB(f.bytes)} · `,
        f.verified === true ? 'verified' : h('strong', {}, 'not verified: its bytes did not match the catalogue'),
        f.about ? h('details', { class: 'storm-about' }, h('summary', {}, "The file's own note"), h('p', {}, f.about)) : null))));
  });
}

// ---------- the source box: a fixed date, not an age ----------
function sourceBox(src) {
  const L = src.latest?.ok ? src.latest.data : null;
  const C = src.card?.ok ? src.card.data : null;
  const u = urls(ID);
  return h('aside', { class: 'prov', 'aria-label': 'Source and terms' },
    h('p', {}, h('strong', {}, 'Source: '), C?.publisher || 'storm-charles.promptugal.news', ', archived by PrompTugal.news and read live from ', h('a', { href: u.page }, 'data.promptugal.news'), '.'),
    h('p', {}, h('strong', {}, 'Archived: '), L?.read_at ? when(L.read_at) : 'date not in the file',
      L?.catalogue?.built_at ? ` · storm site's catalogue built ${when(L.catalogue.built_at)}` : '',
      '. A fixed record of a past storm: this page shows its date, not its age, and never calls it stale.'),
    h('p', {}, h('strong', {}, 'Terms: '), C?.terms?.summary || L?.provenance?.terms || h('em', {}, 'the source card could not be read; see the card before reuse'),
      ' ', h('a', { href: u.card }, 'Source card'), ' · ', h('a', { href: u.latest }, 'latest.json')),
    h('p', { class: 'note' }, 'No collector history: this source was read once, and its reads.json answers "not found".'));
}

async function main() {
  const el = document.getElementById('storm-live');
  if (!el) return;
  const slow = loading(el, 'the Storm Charles archive');
  const src = await loadSource(ID, { onSlow: slow });
  if (!src.latest.ok) {
    failure(el, WHAT, src.latest, STORM_SITE, { pageLabel: 'The storm site keeps its own copy:' });
    el.append(sourceBox(src));
    return;
  }
  const L = src.latest.data;
  const files = Array.isArray(L.files) ? L.files : [];
  if (!files.length) { put(el, h('p', { class: 'status' }, "The archive's file was read but lists no files, so there is nothing to draw."), sourceBox(src)); return; }
  const counts = L.counts || {};
  const G = groups(files);
  const tl = h('div');
  put(el,
    h('p', { class: 'storm-badge' }, h('strong', {}, 'Archive'), ` · fixed on ${L.read_at ? when(L.read_at) : 'a date not in the file'}`,
      L.catalogue?.built_at ? ` · catalogue built ${when(L.catalogue.built_at)}` : ''),
    h('h3', {}, 'The archive at a glance'),
    barChart(G, counts),
    h('h3', {}, 'The dated files on a timeline'),
    tl,
    h('h3', {}, 'Every file'),
    h('p', { class: 'note' }, 'One group per first part of the dataset name; weather is open. Each path links to the file on the storm site, which keeps its own addresses.'),
    fileList(G),
    sourceBox(src));
  timeline(tl, files, L);
}

main().catch(e => {
  const el = document.getElementById('storm-live');
  if (el) failure(el, WHAT, { error: `the page could not draw the file (${e.message})` }, STORM_SITE, { pageLabel: 'The storm site keeps its own copy:' });
});
