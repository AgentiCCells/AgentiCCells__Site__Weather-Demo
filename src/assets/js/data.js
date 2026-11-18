// data.js: read IPMA's data from data.promptugal.news in the browser, and say plainly when a
// file is missing, stale or slow. Never guess a value: a page shows what a file holds or says
// that it could not. ES module, no dependencies. Code Apache-2.0.
// Written by conductor.ipma-data@AgentiCCells.dinis, 2026-11-18, round 1.

export const API = 'https://data.promptugal.news/api/v1';
export const SLOW_MS = 4000;      // after this, the page says the file is slow
export const TIMEOUT_MS = 15000;  // after this, the page gives up on the file and says so

// Hourly sources are collected at 17 minutes past each hour. Past 3 hours old a file is
// "stale"; past 24 hours it is "old" and the page says the figures may no longer hold.
export const STALE_MIN = 180;
export const OLD_MIN = 24 * 60;

const cache = new Map();

// A plain reason for a failed read. The browser's own TypeError text ("Failed to fetch",
// "NetworkError when attempting to fetch resource", "Load failed") becomes one phrase; a bad
// JSON body says so.
function readError(e) {
  if (e instanceof TypeError || /fetch|network|load failed/i.test(e?.message || '')) return 'the network request failed';
  if (e instanceof SyntaxError) return 'the file was read but is not valid JSON';
  return `the file could not be read (${e?.message || 'unknown error'})`;
}

// Fetch one JSON file. Resolves (never rejects) to
// { ok, data, status, error, ms, url }. onSlow() is called once if the file takes longer than SLOW_MS.
export function getJSON(url, { timeout = TIMEOUT_MS, onSlow } = {}) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const t0 = performance.now();
    const ctl = new AbortController();
    const slow = onSlow ? setTimeout(onSlow, SLOW_MS) : null;
    const kill = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctl.signal, mode: 'cors' });
      const ms = Math.round(performance.now() - t0);
      if (!r.ok) return { ok: false, status: r.status, error: `the file answered HTTP ${r.status}`, ms, url };
      const data = await r.json();
      return { ok: true, status: r.status, data, ms, url };
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      const error = e.name === 'AbortError' ? `no answer within ${Math.round(timeout / 1000)} seconds` : readError(e);
      return { ok: false, status: 0, error, ms, url };
    } finally { clearTimeout(kill); if (slow) clearTimeout(slow); }
  })();
  cache.set(url, p);
  return p;
}

export const urls = id => ({
  latest: `${API}/${id}/latest.json`,
  reads: `${API}/${id}/reads.json`,
  card: `${API}/${id}/card.json`,
  openapi: `${API}/${id}/openapi.json`,
  page: `https://data.promptugal.news/sources/${id}/`,
});

// Load a source: latest.json and card.json, and reads.json when asked.
// Resolves to { id, latest, card, reads } where each is a getJSON result.
export async function loadSource(id, { reads = false, onSlow } = {}) {
  const u = urls(id);
  const [latest, card, r] = await Promise.all([
    getJSON(u.latest, { onSlow }), getJSON(u.card), reads ? getJSON(u.reads) : Promise.resolve(null),
  ]);
  return { id, latest, card, reads: r };
}

// ---------- time ----------
export function ageMinutes(iso, now = Date.now()) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.round((now - t) / 60000) : null;
}
// { level: 'fresh' | 'stale' | 'old' | 'unknown', text }
export function staleness(iso, now = Date.now()) {
  const m = ageMinutes(iso, now);
  if (m === null) return { level: 'unknown', text: 'read time unknown' };
  const ago = m < 1 ? 'just now' : m < 90 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
  if (m > OLD_MIN) return { level: 'old', text: `read ${ago}: old, these figures may no longer hold` };
  if (m > STALE_MIN) return { level: 'stale', text: `read ${ago}: stale, the collector may have missed runs` };
  return { level: 'fresh', text: `read ${ago}` };
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
// "18 Nov 2026, 10:11 UTC"
export function fmtUTC(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return 'unknown time';
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
// IPMA's warning times carry no zone: they are Portugal local time, shown as given.
export function fmtLocalNaive(s) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(s || '');
  if (!m) return s || 'unknown';
  return `${Number(m[3])} ${MON[Number(m[2]) - 1]} ${m[4]}:${m[5]}`;
}
// "Wed 18 Nov" from "2026-11-18"
export function fmtDay(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (isNaN(d)) return ymd;
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}
export const num = (v, digits = 0) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v).toFixed(digits));

// ---------- DOM ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// h('div', { class: 'x' }, child, 'text') -> Element. Attributes starting with "on" are listeners.
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
}
const SVGNS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
}

// A status line while a file loads: "Reading ... from data.promptugal.news", then "slow" if it takes long.
export function loading(el, what) {
  el.replaceChildren(h('p', { class: 'status loading', role: 'status' }, `Reading ${what} from data.promptugal.news...`));
  return () => { const p = el.querySelector('.status.loading'); if (p) p.textContent = `Still reading ${what}: data.promptugal.news is slow to answer. Waiting up to ${TIMEOUT_MS / 1000} seconds.`; };
}

// When a file cannot be read: say which, why, and where to look instead. Never a guessed value.
// page: where to look instead (IPMA's page unless the source is someone else's). Options:
// pageLabel, the words before that link ("See IPMA directly:" unless given, e.g.
// "See MeteoAlarm directly:").
export function failure(el, what, result, page, { pageLabel = 'See IPMA directly:' } = {}) {
  el.replaceChildren(h('div', { class: 'status fail', role: 'alert' },
    h('strong', {}, `Could not read ${what}. `),
    `${(e => e.charAt(0).toUpperCase() + e.slice(1))(result?.error || 'unknown error')}. Nothing is shown in its place: this page does not guess. `,
    result?.url ? h('span', {}, 'Open the file to check: ', h('a', { href: result.url }, result.url.replace(/^https?:\/\//, '')), '. ') : null,
    page ? h('span', {}, `${pageLabel} `, h('a', { href: page }, page.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')), '.') : null));
}

// The line above a chart when its file is stale (over STALE_MIN) or old (over OLD_MIN), or
// its read time is unknown; null when the file is fresh. Every data page calls it the same way,
// straight after a successful read, and puts the element (if any) above its chart.
// latest: a getJSON() result for latest.json, or a read_at string. Options: subject ("These
// figures" unless given), page and pageLabel (where to look for the latest: IPMA unless given),
// more (a sentence added after the age), oldLead (replaces "For the latest, see" when old).
export function ageBanner(latest, { subject = 'These figures', page = 'https://www.ipma.pt/en/', pageLabel = 'ipma.pt', more, oldLead } = {}) {
  const L = typeof latest === 'string' ? null : (latest?.ok ? latest.data : null);
  const readAt = typeof latest === 'string' ? latest : (L?.read_at || L?.provenance?.read_at);
  const st = staleness(readAt);
  if (st.level === 'fresh') return null;
  const link = [h('a', { href: page }, pageLabel), '.'];
  if (st.level === 'unknown') return h('p', { class: 'status warn age-banner', role: 'note' },
    h('strong', {}, 'The read time is unknown. '), `${subject} may not be current. For the latest, see `, link);
  return h('p', { class: `status warn age-banner age-banner-${st.level}`, role: 'note' },
    h('strong', {}, `${subject} were ${st.text}.`), more ? ` ${more}` : '', ' ',
    st.level === 'old' && oldLead ? `${oldLead} ` : 'For the latest, see ', link);
}

// The provenance box beside every chart: IPMA as the source, the read time (and how stale),
// the source card's terms, and links to the files. src is a loadSource() result.
// Options: note (a line under the box), pageLabel (the link text for latest.provenance.page;
// "IPMA page" unless given, e.g. "MeteoAlarm page").
export function provenance(src, { note, pageLabel = 'IPMA page' } = {}) {
  const L = src.latest?.ok ? src.latest.data : null;
  const C = src.card?.ok ? src.card.data : null;
  const u = urls(src.id);
  const readAt = L?.read_at || L?.provenance?.read_at;
  const st = staleness(readAt);
  const terms = C?.terms?.summary || L?.provenance?.terms;
  const publisher = C?.publisher || 'IPMA, Instituto Português do Mar e da Atmosfera';
  return h('aside', { class: `prov prov-${st.level}`, 'aria-label': 'Source and terms' },
    h('p', {}, h('strong', {}, 'Source: '), publisher, L?.provenance?.page ? [' (', h('a', { href: L.provenance.page }, pageLabel), ')'] : null,
      ', collected by PrompTugal.news and read live from ', h('a', { href: u.page }, 'data.promptugal.news'), '.'),
    h('p', {}, h('strong', {}, 'Read: '), readAt ? fmtUTC(readAt) : 'unknown', ' ', h('span', { class: `age age-${st.level}` }, `(${st.text})`)),
    h('p', {}, h('strong', {}, 'Terms: '), terms || h('em', {}, 'the source card could not be read; see the card before reuse'),
      ' ', h('a', { href: u.card }, 'Source card'), ' · ', h('a', { href: u.latest }, 'latest.json'), ' · ', h('a', { href: u.reads }, 'reads.json')),
    note ? h('p', { class: 'note' }, note) : null);
}

// The collector's run history from reads.json: one mark per run, newest on the right.
// Each run: ok/failed counts and whether the bytes changed. Returns an element.
export function runStrip(readsResult) {
  if (!readsResult?.ok) return h('p', { class: 'status fail' }, `Collector history unavailable: ${readsResult?.error || 'not read'}.`);
  const runs = (readsResult.data.runs || []).slice().reverse();
  if (!runs.length) return h('p', { class: 'status' }, 'No collector runs recorded yet.');
  const w = 14, gap = 4, H = 26;
  const svg = s('svg', { viewBox: `0 0 ${runs.length * (w + gap)} ${H}`, width: runs.length * (w + gap), height: H, role: 'img', 'aria-label': `${runs.length} collector runs, oldest on the left` });
  // changed is true, false, or the string "first read" on the very first run (data notes, round 1):
  // only true means the bytes changed.
  runs.forEach((r, i) => {
    const changed = (r.reads || []).some(x => x.changed === true);
    const first = !changed && (r.reads || []).some(x => x.changed === 'first read');
    const cls = r.failed ? 'run-fail' : changed ? 'run-changed' : first ? 'run-first' : 'run-same';
    const t = s('rect', { x: i * (w + gap), y: 2, width: w, height: H - 4, rx: 3, class: cls });
    t.append(s('title', {}, `${fmtUTC(r.at)}: ${r.ok} read ok, ${r.failed} failed${changed ? ', data changed' : first ? ', first read' : ', data unchanged'}`));
    svg.append(t);
  });
  const ul = h('ul', { class: 'sr-runs', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' },
    runs.map(r => { const c = (r.reads || []).some(x => x.changed === true); const f = !c && (r.reads || []).some(x => x.changed === 'first read');
      return h('li', {}, `${fmtUTC(r.at)}: ${r.ok} read ok, ${r.failed} failed, ${c ? 'data changed' : f ? 'first read' : 'data unchanged'}`); }));
  return h('figure', { class: 'runs' }, h('div', { class: 'table-wrap' }, svg), ul, h('figcaption', {}, `The collector's last ${runs.length} runs (from reads.json), oldest first. `,
    h('span', { class: 'key run-changed' }), ' new data ', h('span', { class: 'key run-same' }), ' unchanged ', h('span', { class: 'key run-first' }), ' first read ', h('span', { class: 'key run-fail' }), ' a read failed.'));
}
