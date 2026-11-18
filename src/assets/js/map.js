// map.js: the hex map of Portugal, built in the browser from the 278 municipality points in
// ipma-fire-risk latest.json (read live), with Madeira and the Azores as labelled tiles. No
// geometry and no IPMA data live in this file: only the recipe (team/rounds/1/design/PROPOSAL.md,
// section 1) and a fixed tile layout for the fallback when the fire-risk file cannot be read.
// Layers on the same base: warning areas filled by level (with hatches), municipalities filled by
// a class (fire risk), and points (stations, coastal places). ES module, no dependencies beyond
// data.js and codes.js. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance A), 2026-11-18, round 1.

import { h, s, fmtDay, fmtUTC, ageMinutes, provenance, ageBanner } from './data.js';
import { AREAS, areaForDico, WARNING_LEVELS } from './codes.js';

// ---------- areas ----------
// Reading order, north to south, then the Azores and Madeira (proposal, keyboard section).
export const ORDER = ['VCT', 'BRG', 'VRL', 'BGC', 'PTO', 'AVR', 'VIS', 'GDA', 'CBR', 'CBO', 'LRA', 'STM', 'PTG', 'LSB', 'STB', 'EVR', 'BJA', 'FAR',
  'AOC', 'ACE', 'AOR', 'MPS', 'MCN', 'MRM', 'MCS'];
export const MAINLAND = ORDER.slice(0, 18);
const SHORT = { VCT: 'Viana', CBO: 'C. Branco' };
// Inset tile labels: [wide layout, narrow layout].
const INSET_LABEL = { AOC: ['W', 'Western'], ACE: ['C', 'Central'], AOR: ['E', 'Eastern'], MPS: ['PS', 'Porto Santo'], MCN: ['North', 'North coast'], MRM: ['Mount.', 'Mountains'], MCS: ['South', 'South coast'] };
export const areaName = c => AREAS[c]?.name || c;

// ---------- projection ----------
// Equirectangular, centred on 39.6 N, 8.0 W, in kilometres; y grows southward as in SVG.
const LAT0 = 39.6, LON0 = -8.0, KX = 111.32 * Math.cos(LAT0 * Math.PI / 180), KY = 110.57;
export const project = (lat, lon) => [(lon - LON0) * KX, (LAT0 - lat) * KY];

// ---------- the hex grid ----------
const HS = 4.5, DX = HS * Math.sqrt(3), DY = HS * 1.5; // pointy-top, 4.5 km centre to corner
// Neighbours in edge order E, SE, SW, W, NW, NE; odd rows are shifted half a hex right.
const NB = r => (r & 1) ? [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]] : [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]];
const K = (r, c) => r * 10000 + c;
const RC = k => [Math.floor(k / 10000), k % 10000];
const gridCache = new WeakMap();

// Build the grid once per municipalities array. Returns null when the file holds too few usable
// points to give a shape (the caller then uses the tile fallback).
export function buildGrid(munis) {
  if (!Array.isArray(munis)) return null;
  if (gridCache.has(munis)) return gridCache.get(munis);
  const pts = [];
  for (const m of munis) {
    const a = areaForDico(m?.dico);
    if (!a || !Number.isFinite(m.lat) || !Number.isFinite(m.lon)) continue;
    const [x, y] = project(m.lat, m.lon);
    pts.push({ x, y, a, m });
  }
  if (pts.length < 50) { gridCache.set(munis, null); return null; }
  // Radius: clamp(12 km, 0.9 x distance to the second-nearest point, 24 km).
  for (const p of pts) {
    let d1 = Infinity, d2 = Infinity;
    for (const q of pts) {
      if (q === p) continue;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    p.r = Math.max(12, Math.min(24, 0.9 * d2));
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const X0 = Math.min(...xs) - 30, Y0 = Math.min(...ys) - 30;
  const C = Math.ceil((Math.max(...xs) + 30 - X0) / DX), R = Math.ceil((Math.max(...ys) + 30 - Y0) / DY);
  const at = (r, c) => [X0 + c * DX + ((r & 1) ? DX / 2 : 0), Y0 + r * DY];
  const near = (x, y) => { let b = null, bd = Infinity; for (const p of pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = p; } } return [b, bd]; };
  const cell = new Map();
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const [x, y] = at(r, c); const [b, bd] = near(x, y); if (bd <= b.r) cell.set(K(r, c), b); }
  // Hole fill: six passes; an empty hex with 4 or more land neighbours becomes land.
  for (let it = 0; it < 6; it++) {
    const add = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (cell.has(K(r, c))) continue;
      let n = 0; for (const [a, b] of NB(r)) if (cell.has(K(r + a, c + b))) n++;
      if (n >= 4) { const [x, y] = at(r, c); add.push([K(r, c), near(x, y)[0]]); }
    }
    for (const [k, p] of add) cell.set(k, p);
  }
  const G = { cell, at, pts, box: [Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20] };
  gridCache.set(munis, G);
  return G;
}

// Group the hexes by key(point): one path per group, its outer edge (for the selection outline),
// a label point, the coast, the borders between groups and the borders between districts.
export function hexPaths(G, key) {
  const f = n => n.toFixed(1);
  const V = (x, y, i) => { const a = Math.PI / 180 * (60 * i - 30); return [x + HS * Math.cos(a), y + HS * Math.sin(a)]; };
  const groups = {}, coast = [], border = [], district = [];
  const kOf = new Map();
  for (const [k, p] of G.cell) kOf.set(k, String(key(p)));
  for (const [k, p] of G.cell) {
    const [r, c] = RC(k); const [x, y] = G.at(r, c); const vs = [0, 1, 2, 3, 4, 5].map(i => V(x, y, i));
    const g = kOf.get(k);
    const A = (groups[g] ??= { d: '', o: '', sx: 0, sy: 0, n: 0, cells: [] });
    A.d += 'M' + vs.map(v => f(v[0]) + ',' + f(v[1])).join('L') + 'Z'; A.sx += x; A.sy += y; A.n++; A.cells.push([x, y]);
    NB(r).forEach(([dr, dc], e) => {
      const nk = K(r + dr, c + dc); const v1 = vs[e], v2 = vs[(e + 1) % 6];
      const seg = `M${f(v1[0])},${f(v1[1])}L${f(v2[0])},${f(v2[1])}`;
      const q = G.cell.get(nk);
      if (!q) { coast.push(seg); A.o += seg; return; }
      if (kOf.get(nk) !== g) A.o += seg;
      if (nk > k) { if (kOf.get(nk) !== g) border.push(seg); if (q.a !== p.a) district.push(seg); }
    });
  }
  for (const A of Object.values(groups)) {
    const cx = A.sx / A.n, cy = A.sy / A.n; let b = A.cells[0], bd = Infinity;
    for (const p of A.cells) { const d = Math.hypot(p[0] - cx, p[1] - cy); if (d < bd) { bd = d; b = p; } }
    A.lx = b[0]; A.ly = b[1]; delete A.cells;
  }
  return { groups, coast: coast.join(''), border: border.join(''), district: district.join(''), box: G.box };
}

// The base for area layers: the 18 mainland areas as hex groups, or tiles when G is null.
// The fallback: 18 equal tiles in a fixed layout (column, row), not geography.
const TILES = { VCT: [0, 0], BRG: [1, 0], VRL: [2, 0], BGC: [3, 0], PTO: [0, 1], VIS: [1, 1], GDA: [2, 1], AVR: [0, 2], CBR: [1, 2], CBO: [2, 2], LRA: [0, 3], STM: [1, 3], PTG: [2, 3], LSB: [0, 4], STB: [1, 4], EVR: [2, 4], BJA: [1, 5], FAR: [1, 6] };
export function areaBase(G) {
  if (G) {
    const P = hexPaths(G, p => p.a);
    return { areas: P.groups, coast: P.coast, border: P.border, box: P.box, tiles: false };
  }
  const T = 46, areas = {};
  for (const [a, [c, r]] of Object.entries(TILES)) { const x = -100 + c * (T + 4), y = -170 + r * (T + 4); areas[a] = { d: `M${x},${y}h${T}v${T}h${-T}Z`, o: `M${x},${y}h${T}v${T}h${-T}Z`, lx: x + T / 2, ly: y + T / 2 }; }
  return { areas, coast: '', border: '', box: [-110, -180, 110, 190], tiles: true };
}

// Madeira and the Azores: always labelled tiles (no IPMA points give their shape).
function insets(x0, y0, narrow) {
  const A = {}, G = 4, T = narrow ? 92 : 34, TH = narrow ? 30 : 34;
  ['AOC', 'ACE', 'AOR'].forEach((a, i) => { const x = x0 + i * (T + G), y = y0 + 22; A[a] = { d: `M${x},${y}h${T}v${TH}h${-T}Z`, lx: x + T / 2, ly: y + TH / 2 }; });
  const mx = x0, my = y0 + (narrow ? TH + 44 : 130), MW = narrow ? 184 : 70, MH = 24;
  const px = mx + MW + G + (narrow ? 8 : 6), py = my + (narrow ? 8 : 30), PW = narrow ? 80 : 30, PH = narrow ? 26 : 22;
  A.MPS = { d: `M${px},${py}h${PW}v${PH}h${-PW}Z`, lx: px + PW / 2, ly: py + PH / 2 };
  ['MCN', 'MRM', 'MCS'].forEach((a, i) => { const y = my + 30 + i * (MH + G); A[a] = { d: `M${mx},${y}h${MW}v${MH}h${-MW}Z`, lx: mx + MW / 2, ly: y + MH / 2 }; });
  for (const a of Object.keys(A)) A[a].o = A[a].d;
  const hgt = (my + 30 + 3 * (MH + G)) - y0;
  return { A, h: hgt, caps: [[x0, y0 + 14, narrow ? 'Azores, three groups (not to scale)' : 'Azores (not to scale)'], [x0, my + 20, 'Madeira (not to scale)']] };
}

// ---------- hatches and swatches ----------
// Hatch patterns live once in the page, in a hidden SVG, in user space so they run across hexes.
export const HATCH = { green: [], yellow: ['ipma-hy'], orange: ['ipma-ho1', 'ipma-ho2'], red: ['ipma-hr1', 'ipma-hr2'] };
export function ensureHatches() {
  if (document.getElementById('ipma-hatches')) return;
  const pat = (id, ang, gap, w, col) => s('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap, patternTransform: `rotate(${ang})` },
    s('line', { x1: 0, y1: 0, x2: 0, y2: gap, style: `stroke:var(${col})`, 'stroke-width': w }));
  const svg = s('svg', { id: 'ipma-hatches', class: 'hatch-defs', 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0 },
    s('defs', {}, pat('ipma-hy', 45, 7, 1.3, '--hatch-dark'), pat('ipma-ho1', 45, 6, 1.3, '--hatch-dark'), pat('ipma-ho2', -45, 6, 1.3, '--hatch-dark'),
      pat('ipma-hr1', 45, 4.2, 1.5, '--hatch-light'), pat('ipma-hr2', -45, 4.2, 1.5, '--hatch-light')));
  document.body.prepend(svg);
}
const LEVELS = ['green', 'yellow', 'orange', 'red'];
const levelOk = l => LEVELS.includes(l) ? l : 'green';
export const levelWord = l => WARNING_LEVELS[l]?.name || String(l);
// A swatch: the level's fill plus its hatch, with a 1 px map-edge border (the same everywhere).
export function swatch(level) {
  ensureHatches();
  const l = levelOk(level);
  return s('svg', { class: 'sw', viewBox: '0 0 22 16', 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { width: 22, height: 16, style: `fill:var(--w-${l})` }), ...HATCH[l].map(p => s('rect', { width: 22, height: 16, style: `fill:url(#${p})` })));
}
// Swatch plus word: "Yellow". text overrides the word.
export const lvl = (level, text) => h('span', { class: 'lvl' }, swatch(level), text ?? levelWord(level));

// Text sizes in screen pixels whatever the map's width: font-size = px / k.
function fitText(svg, vbw) {
  const fit = () => {
    const k = svg.getBoundingClientRect().width / vbw; if (!k) return;
    svg.style.setProperty('--halo', 3 / k); svg.style.setProperty('--selw', 2.4 / k);
    svg.querySelectorAll('text[data-px]').forEach(t => t.setAttribute('font-size', Number(t.dataset.px) / k));
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(svg);
  fit();
}

// ---------- the area map (warnings) ----------
// el: the container. base: areaBase(G). opts.label: the map's aria-label.
// Returns { paint(levels, describe), select(code), selected() } where levels is { code: level } and
// describe(code) gives each area's aria-label. Re-lays out when the container crosses 560 px.
export function areaMap(el, base, { label = 'Map of the 25 warning areas', onSelect } = {}) {
  ensureHatches();
  let narrow = null, nodes = {}, levels = {}, describe = c => areaName(c), sel = null, focusCode = ORDER[0];
  const layout = () => {
    const nw = el.clientWidth < 560;
    if (nw === narrow) return; narrow = nw;
    const [bx0, by0, bx1, by1] = base.box;
    let vb, ins;
    if (narrow) { ins = insets(bx0 + 4, by1 + 6, true); vb = [bx0 - 6, by0 - 10, bx1 - bx0 + 12, by1 - by0 + 26 + ins.h]; }
    else { const ix = bx0 - 150; ins = insets(ix + 6, by0 + 10, false); vb = [ix, by0 - 10, bx1 - ix + 6, Math.max(by1 - by0 + 20, ins.h + 30)]; }
    const svg = s('svg', { class: 'map', viewBox: vb.join(' '), role: 'group', 'aria-label': `${label}. One tab stop: arrow keys move between areas, Enter or Space selects.` });
    const all = { ...base.areas, ...ins.A };
    const g = s('g'); svg.append(g); nodes = {};
    for (const a of ORDER) {
      const A = all[a]; if (!A) continue;
      const tile = base.tiles || !!ins.A[a];
      const grp = s('g', { class: 'area', tabindex: a === focusCode ? 0 : -1, role: 'button', 'data-a': a });
      const fill = s('path', { d: A.d, style: 'stroke:var(--bg)', 'stroke-width': tile ? 1.5 : 0.5 });
      const hatch = [s('path', { d: A.d, class: 'hatch', 'pointer-events': 'none' }), s('path', { d: A.d, class: 'hatch', 'pointer-events': 'none' })];
      const selp = s('path', { d: A.o || A.d, class: 'sel', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      grp.append(fill, ...hatch, selp); g.append(grp); nodes[a] = { grp, fill, hatch };
      grp.addEventListener('click', () => pick(a));
      grp.addEventListener('focus', () => { focusCode = a; pick(a); });
      if (matchMedia('(hover: hover)').matches) grp.addEventListener('mouseenter', () => pick(a));
    }
    const top = s('g', { 'pointer-events': 'none' }); svg.append(top);
    if (base.border) top.append(s('path', { d: base.border, class: 'gap', 'stroke-width': 2 }));
    if (base.coast) top.append(s('path', { d: base.coast, class: 'coast', 'stroke-width': 1.1 }));
    for (const a of Object.keys(ins.A)) top.append(s('path', { d: ins.A[a].d, class: 'tileframe', 'stroke-width': 1 }));
    if (base.tiles) for (const a of MAINLAND) top.append(s('path', { d: base.areas[a].d, class: 'tileframe', 'stroke-width': 1 }));
    // Selection outline on a top layer.
    const selLayer = s('g', { 'pointer-events': 'none' }); top.append(selLayer);
    const labels = s('g', { 'aria-hidden': 'true' }); top.append(labels);
    for (const a of ORDER) {
      const A = all[a]; if (!A) continue;
      const txt = ins.A[a] ? INSET_LABEL[a][narrow ? 1 : 0] : (SHORT[a] || areaName(a));
      labels.append(s('text', { x: A.lx, y: A.ly, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'data-px': 12, 'font-weight': 600 }, txt));
    }
    for (const [x, y, t] of ins.caps) labels.append(s('text', { x, y, class: 'cap', 'data-px': 11 }, t));
    svg.addEventListener('keydown', e => {
      const i = ORDER.indexOf(document.activeElement?.dataset?.a); if (i < 0) return;
      const n = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -i, End: ORDER.length - 1 - i }[e.key];
      if (n !== undefined) { e.preventDefault(); const j = (i + n + ORDER.length) % ORDER.length; nodes[ORDER[i]].grp.tabIndex = -1; nodes[ORDER[j]].grp.tabIndex = 0; nodes[ORDER[j]].grp.focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(ORDER[i]); }
    });
    nodes._sel = { layer: selLayer, all };
    el.replaceChildren(svg);
    fitText(svg, vb[2]);
    apply();
    if (sel) mark(sel);
  };
  const apply = () => {
    for (const a of ORDER) {
      const N = nodes[a]; if (!N) continue;
      const L = levelOk(levels[a]);
      N.fill.style.fill = levels[a] ? `var(--w-${L})` : 'var(--w-none)';
      N.hatch.forEach((p, i) => { p.style.fill = levels[a] && HATCH[L][i] ? `url(#${HATCH[L][i]})` : 'none'; });
      N.grp.setAttribute('aria-label', describe(a));
      N.grp.setAttribute('aria-pressed', String(a === sel));
    }
  };
  const mark = a => {
    for (const [c, N] of Object.entries(nodes)) if (c !== '_sel') N.grp.classList.toggle('on', c === a);
    const { layer, all } = nodes._sel; const A = all[a];
    layer.replaceChildren(A ? s('path', { d: A.o || A.d, style: 'fill:none;stroke:var(--ink);stroke-width:var(--selw,2.4)', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }) : '');
    for (const [c, N] of Object.entries(nodes)) if (c !== '_sel') N.grp.setAttribute('aria-pressed', String(c === a));
  };
  const pick = a => { if (sel === a) { mark(a); return; } sel = a; mark(a); onSelect?.(a); };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => layout()).observe(el);
  layout();
  return {
    paint(lv, desc) { levels = lv || {}; if (desc) describe = desc; apply(); },
    select(a) { sel = null; pick(a); },
    selected: () => sel,
  };
}

// ---------- municipality classes (fire risk) ----------
// Each hex takes the class of its nearest municipality point: key(m) gives the class, fill(cls)
// the CSS fill. District borders as gaps, the coast in --map-edge. Returns the SVG.
export function classMap(el, G, key, fill, { label }) {
  const P = hexPaths(G, p => key(p.m));
  const [bx0, by0, bx1, by1] = P.box; const vb = [bx0 - 6, by0 - 10, bx1 - bx0 + 12, by1 - by0 + 20];
  const svg = s('svg', { class: 'map', viewBox: vb.join(' '), role: 'img', 'aria-label': label });
  for (const [k, A] of Object.entries(P.groups)) svg.append(s('path', { d: A.d, style: `fill:${fill(k)};stroke:var(--panel)`, 'stroke-width': 0.5 }));
  // District borders come from the area grouping, whatever the class.
  const D = hexPaths(G, p => p.a);
  svg.append(s('path', { d: D.border, class: 'gap', 'stroke-width': 1.6 }), s('path', { d: P.coast, class: 'coast', 'stroke-width': 1 }));
  const labels = s('g', { 'aria-hidden': 'true', 'pointer-events': 'none' });
  for (const a of MAINLAND) { const A = D.groups[a]; if (A) labels.append(s('text', { x: A.lx, y: A.ly, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'data-px': 11, 'font-weight': 600 }, SHORT[a] || areaName(a))); }
  svg.append(labels);
  el.replaceChildren(svg);
  fitText(svg, vb[2]);
  return svg;
}

// ---------- point layers (stations, coastal places) ----------
// points: [{ lat, lon, ... }], drawn in the order given (put rings first so filled marks sit on top).
// mark(x, y, p, k) returns an SVG element for one point (k: map units per km in that frame, 1 on the
// mainland). Mainland points on the hex land (or on a blank frame when G is null); the Azores,
// Madeira and the Selvagens in framed insets, each at its own scale. Returns { svg, unit } .
export function pointMap(el, G, points, { mark, label }) {
  const isAz = p => p.lon < -20, isSel = p => !isAz(p) && p.lat < 31, isMd = p => !isAz(p) && !isSel(p) && p.lat < 34;
  const main = points.filter(p => !isAz(p) && p.lat >= 34);
  const groups = [['Azores (own scale)', points.filter(isAz)], ['Madeira (own scale)', points.filter(isMd)], ['Selvagens', points.filter(isSel)]].filter(g => g[1].length);
  let box;
  if (G) box = G.box;
  else { const xy = main.map(p => project(p.lat, p.lon)); box = xy.length ? [Math.min(...xy.map(v => v[0])) - 20, Math.min(...xy.map(v => v[1])) - 20, Math.max(...xy.map(v => v[0])) + 20, Math.max(...xy.map(v => v[1])) + 20] : [-150, -280, 150, 280]; }
  const [bx0, by0, bx1, by1] = box;
  const narrow = el.clientWidth < 560;
  const frames = [];
  let vb;
  if (narrow) {
    const fw = bx1 - bx0, fy = by1 + 26;
    const sizes = { 'Azores (own scale)': [fw, 90], 'Madeira (own scale)': [fw * 0.62, 80], Selvagens: [fw * 0.34, 80] };
    let x = bx0, y = fy;
    for (const [t, list] of groups) {
      const [w, hh] = sizes[t];
      if (x + w > bx1 + 1) { x = bx0; y += 90 + 26; }
      frames.push([x, y, w, hh, list, t]); x += w + fw * 0.04;
    }
    const bottom = frames.length ? Math.max(...frames.map(f => f[1] + f[3])) : by1;
    vb = [bx0 - 6, by0 - 10, bx1 - bx0 + 12, bottom - by0 + 16];
  } else {
    const ix = bx0 - 170; let y = by0 + 26;
    const sizes = { 'Azores (own scale)': [156, 80], 'Madeira (own scale)': [110, 80], Selvagens: [60, 50] };
    for (const [t, list] of groups) { const [w, hh] = sizes[t]; frames.push([ix + 6, y, w, hh, list, t]); y += hh + 34; }
    vb = [ix, by0 - 10, bx1 - ix + 6, by1 - by0 + 20];
  }
  const svg = s('svg', { class: 'map', viewBox: vb.join(' '), role: 'img', 'aria-label': label });
  if (G) {
    const P = hexPaths(G, p => p.a);
    const land = s('g', { 'aria-hidden': 'true' });
    for (const A of Object.values(P.groups)) land.append(s('path', { d: A.d, class: 'land', 'stroke-width': 0.6 }));
    svg.append(land, s('path', { d: P.border, class: 'gap', 'stroke-width': 1.6 }), s('path', { d: P.coast, class: 'coast', 'stroke-width': 1 }));
  } else {
    svg.append(s('rect', { x: bx0, y: by0, width: bx1 - bx0, height: by1 - by0, rx: 6, class: 'frame', 'stroke-width': 0.8 }),
      s('text', { x: bx0 + 6, y: by0 + 14, class: 'cap', 'data-px': 11 }, 'Mainland: land outline not available'));
  }
  const proj = [];
  for (const [x0, y0, w, hh, list, t] of frames) {
    svg.append(s('rect', { x: x0, y: y0, width: w, height: hh, rx: 4, class: 'frame', 'stroke-width': 0.8 }), s('text', { x: x0 + 2, y: y0 - 5, class: 'cap', 'data-px': 11 }, t));
    const la = list.map(p => p.lat), lo = list.map(p => p.lon);
    const a0 = Math.min(...lo), a1 = Math.max(...lo), b0 = Math.min(...la), b1 = Math.max(...la);
    const kx = Math.cos(((b0 + b1) / 2) * Math.PI / 180);
    const spanX = (a1 - a0) * kx * 111.32, spanY = (b1 - b0) * 110.57;
    const sc = Math.min(spanX ? (w - 20) / spanX : Infinity, spanY ? (hh - 20) / spanY : Infinity);
    const k = Number.isFinite(sc) ? Math.min(sc, 1.5) : 1;
    const ox = x0 + w / 2 - spanX * k / 2, oy = y0 + hh / 2 - spanY * k / 2;
    proj.push([new Set(list), p => [ox + (p.lon - a0) * kx * 111.32 * k, oy + (b1 - p.lat) * 110.57 * k]]);
  }
  const g = s('g');
  for (const p of points) {
    const f = proj.find(([set]) => set.has(p));
    const [x, y] = f ? f[1](p) : project(p.lat, p.lon);
    const m = mark(x, y, p); if (m) g.append(m);
  }
  svg.append(g);
  el.replaceChildren(svg);
  fitText(svg, vb[2]);
  return svg;
}

// ---------- warnings on the map ----------
// IPMA's warning times are Portugal local time with no zone: compare them with the current
// Lisbon wall-clock time, never with UTC. Returns "YYYY-MM-DDTHH:MM:SS".
export function lisbonNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
export const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export function warningWindows(now = lisbonNow()) {
  const today = now.slice(0, 10), day = n => addDays(today, n) + 'T00:00:00';
  const plus1 = new Date(Date.parse(now + 'Z') + 60000).toISOString().slice(0, 19);
  return [
    { id: 'now', label: 'In force now', from: now, to: plus1 },
    { id: 'today', label: `Today, ${fmtDay(today)}`, short: 'today', from: day(0), to: day(1) },
    { id: 'tomorrow', label: `Tomorrow, ${fmtDay(addDays(today, 1))}`, short: 'tomorrow', from: day(1), to: day(2) },
    { id: 'after', label: `Day after, ${fmtDay(addDays(today, 2))}`, short: 'the day after tomorrow', from: day(2), to: day(3) },
  ];
}
const valid = w => w && typeof w.start === 'string' && typeof w.end === 'string' && LEVELS.includes(w.level) && w.level !== 'green';
// Highest level per area whose time overlaps the window; green when the file has nothing.
export function levelsFor(active, win) {
  const by = Object.fromEntries(ORDER.map(a => [a, { level: 'green', items: [] }]));
  for (const w of active || []) {
    if (!valid(w) || !(w.start < win.to && w.end > win.from)) continue;
    const B = (by[w.area] ??= { level: 'green', items: [] }); B.items.push(w);
    if (LEVELS.indexOf(w.level) > LEVELS.indexOf(B.level)) B.level = w.level;
  }
  return by;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "Wed 18 Nov 12:00" from a naive Portugal time.
export const fmtPT = t => (typeof t === 'string' && t.length >= 16) ? `${fmtDay(t.slice(0, 10))} ${t.slice(11, 16)}` : 'unknown';
export const fmtSpan = w => w.start?.slice(0, 10) === w.end?.slice(0, 10) ? `${fmtPT(w.start)} to ${w.end.slice(11, 16)}` : `${fmtPT(w.start)} to ${fmtPT(w.end)}`;
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;

// The warnings in force now or later, in reading order then by start; and how many have ended.
export function currentWarnings(active, now = lisbonNow()) {
  const all = (active || []).filter(valid);
  const rows = all.filter(w => w.end > now).sort((a, b) => ORDER.indexOf(a.area) - ORDER.indexOf(b.area) || a.start.localeCompare(b.start));
  return { rows, ended: all.length - rows.length, areas: new Set(rows.map(w => w.area)).size };
}

// The table alternative to the map: Area, Level, Type, From, To (Portugal time), and IPMA's text
// when withText. Stacks into blocks on phones.
export function warningTable(active, { withText = false, now = lisbonNow() } = {}) {
  const { rows, ended } = currentWarnings(active, now);
  const capTxt = `${rows.length} warning${rows.length === 1 ? '' : 's'} in force or upcoming in IPMA's file, in ${new Set(rows.map(w => w.area)).size} of 25 areas; areas not listed have none (green). Times are Portugal time, as IPMA gives them.${ended ? ` ${ended} spell${ended === 1 ? ' has' : 's have'} already ended and ${ended === 1 ? 'is' : 'are'} not listed.` : ''}`;
  if (!rows.length) return h('p', {}, 'No yellow, orange or red warning in IPMA\'s file for now or later: every area is green. ', h('span', { class: 'muted' }, capTxt));
  const head = ['Area', 'Level', 'Type', 'From', 'To'].concat(withText ? ["IPMA's text (Portuguese)"] : []);
  return h('div', { class: 'table-wrap' }, h('table', { class: 'stack' }, h('caption', {}, capTxt),
    h('thead', {}, h('tr', {}, head.map(x => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map(w => h('tr', {},
      h('th', { scope: 'row' }, areaName(w.area)),
      h('td', { 'data-label': 'Level' }, lvl(w.level)),
      h('td', { 'data-label': 'Type' }, w.type || w.type_pt || 'not given'),
      h('td', { 'data-label': 'From' }, fmtPT(w.start)),
      h('td', { 'data-label': 'To' }, fmtPT(w.end)),
      withText ? h('td', { 'data-label': 'Text', lang: 'pt' }, w.text || h('span', { class: 'muted', lang: 'en-GB' }, 'no text in the file')) : null)))));
}

// The whole warnings map block: time control, skip link, map, legend, note, and the detail panel.
// els: { ctl, map, legend, note, detail, stale } elements. warn: the latest.json data. base: areaBase(G).
// tableId: the id of the table section the skip link jumps to.
export function warningsMap(els, warn, base, { tableId, readAt } = {}) {
  const wins = warningWindows();
  let wi = 0, by = levelsFor(warn.active, wins[0]);
  const age = ageMinutes(readAt);
  if (els.stale) {
    // The stale or old line above the map (data.js ageBanner), as on every data page; past
    // 12 hours it adds that IPMA reissues its warnings at least twice a day.
    const banner = ageBanner(readAt ?? null, { subject: 'These warnings', page: 'https://www.ipma.pt/en/otempo/prev-sam/',
      more: age !== null && age > 12 * 60 ? 'IPMA reissues its warnings at least twice a day, so they may have ended or changed.' : undefined });
    els.stale.replaceChildren(...(banner ? [banner] : []));
  }
  const describe = a => {
    const B = by[a]; const types = [...new Set(B.items.map(w => w.type || w.type_pt))];
    return `${areaName(a)}: ${B.level === 'green' ? 'no warning' : B.level + ' warning'}${types.length ? ', ' + types.join(' and ') : ''}, ${wins[wi].id === 'now' ? 'in force now' : wins[wi].short}`;
  };
  const detail = a => {
    if (!els.detail) return;
    const B = by[a];
    const list = (warn.active || []).filter(w => valid(w) && w.area === a).sort((x, y) => x.start.localeCompare(y.start));
    const now = lisbonNow();
    els.detail.replaceChildren(h('h3', {}, areaName(a)),
      h('p', {}, lvl(B.level, B.level === 'green' ? 'No warning' : levelWord(B.level)), ' ', h('span', { class: 'muted' }, wins[wi].id === 'now' ? 'in force now' : wins[wi].short)),
      list.length ? h('ul', { class: 'wl' }, list.map(w => h('li', {}, swatch(w.level), h('div', {},
        h('strong', {}, `${levelWord(w.level)}, ${w.type || w.type_pt}`), w.end <= now ? h('span', { class: 'muted' }, ' (ended)') : null, h('br'),
        h('span', { class: 'muted' }, `${fmtSpan(w)} (Portugal time)`), h('br'),
        h('span', { lang: 'pt' }, w.text || ''))))) : h('p', { class: 'muted' }, 'IPMA lists no yellow, orange or red warning for this area in the file.'));
  };
  const map = areaMap(els.map, base, { label: 'Map of the 25 warning areas, each filled by its highest warning level', onSelect: detail });
  const paint = () => {
    by = levelsFor(warn.active, wins[wi]);
    map.paint(Object.fromEntries(ORDER.map(a => [a, by[a].level])), describe);
    const n = ORDER.filter(a => by[a].level !== 'green').length;
    if (els.note) els.note.textContent = `${wins[wi].label}: ${n} of 25 areas have a yellow, orange or red warning${n ? '' : '. No yellow, orange or red warning in IPMA\'s file for this time'}. Each area shows its highest level in that time. ${base.tiles
      ? 'Tiles, not geography: the file that gives the map its shape could not be read.'
      : 'The mainland\'s shape is drawn from IPMA\'s 278 municipality points: each hexagon takes the district of the nearest point, so coasts and borders are approximate.'} Madeira and the Azores are tiles, not to scale.`;
    const s0 = map.selected(); if (s0) detail(s0);
  };
  if (els.ctl) {
    els.ctl.replaceChildren(...wins.map((w, i) => h('button', { type: 'button', 'aria-pressed': String(i === wi), onclick: () => {
      wi = i; els.ctl.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i))); paint();
    } }, i === 0 ? w.label : w.label.split(',')[0])));
  }
  if (els.legend) els.legend.replaceChildren(...LEVELS.map(l => h('li', {}, swatch(l), l === 'green' ? 'Green: no warning' : levelWord(l))));
  paint();
  // Open with the area of the highest level selected, so the panel is never empty.
  const topA = ORDER.slice().sort((x, y) => LEVELS.indexOf(by[y].level) - LEVELS.indexOf(by[x].level))[0];
  map.select(topA);
  return { map, tableId };
}

// The warnings block used on the home and warnings pages: the map panel and the detail panel side
// by side (under each other on phones), then the provenance box. warnSrc and fireSrc are
// loadSource() results; when the fire-risk file is missing the map falls back to tiles.
export function warningsBlock(el, warnSrc, fireSrc, { tableId } = {}) {
  const W = warnSrc.latest.data;
  const F = fireSrc?.latest?.ok ? fireSrc.latest.data : null;
  const G = F ? buildGrid(F.municipalities) : null;
  const base = areaBase(G);
  const els = {
    ctl: h('div', { class: 'ctl', role: 'group', 'aria-label': 'Which time to show' }),
    stale: h('div'),
    map: h('div', { class: 'mapbox' }),
    legend: h('ul', { class: 'legend', 'aria-label': 'Legend' }),
    note: h('p', { class: 'map-note' }),
    detail: h('section', { class: 'panel detail', 'aria-live': 'polite', 'aria-label': 'The selected area' }),
  };
  el.replaceChildren(
    h('div', { class: 'grid two' },
      h('div', { class: 'panel' }, els.ctl, tableId ? h('a', { class: 'skiplink', href: `#${tableId}` }, 'Skip the map: warnings as a table') : null, els.stale, els.map, els.legend, els.note),
      els.detail),
    provenance(warnSrc, { note: G
      ? h('span', {}, "The map's shape: IPMA's municipality points in ipma-fire-risk, read ", fmtUTC(F.read_at), '. Warning times are Portugal local time; IPMA gives them without a time zone.')
      : h('span', {}, `The map's shape could not be drawn: ipma-fire-risk ${fireSrc?.latest?.error ? `was not available (${fireSrc.latest.error.replace(/^the file could not be read \((.*)\)$/, '$1')})` : 'held too few points'}, so the areas are shown as tiles. Warning times are Portugal local time; IPMA gives them without a time zone.`) }));
  return warningsMap(els, W, base, { tableId, readAt: W.read_at });
}
