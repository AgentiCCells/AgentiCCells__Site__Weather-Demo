// postcard.js: the Postcard design, /d/postcard/?id=<globalIdLocal>[&side=back]. One town as a
// postcard: the front carries the day's message, the warnings stamp, the warnings and the forecast;
// the back carries the station, sea, UV, fire risk, how the card was put together and the terms.
// A plain button turns it over. Every block keeps its source line and its own failure and stale
// states (place-blocks.js); nothing is guessed. ES module. Code Apache-2.0.
// Written by developer.weather-demo@AgentiCCells.dinis (instance C), 2026-11-18, round 2, from
// team/rounds/2/design/PROPOSAL.md sections 2 and 3.

import { h, statusBand, termsBlock, sourceState, provLine } from '/assets/js/data.js';
import { areaOf, SEA_NEAR_KM } from '/assets/js/places.js';
import { swatch, levelsFor, warningWindows, lisbonNow, levelWord, areaName } from '/assets/js/map.js';
import {
  SOURCES, loadSix, renderBlock, summaryText, agedClause, howTable, fetchSnippet, stormLine, copyText,
  placesFromURL, townSelect, setTown, keepTown,
} from '/assets/js/place-blocks.js';

const NAME = 'Postcard';
const root = document.getElementById('d-root');
const mainLink = document.getElementById('d-main-link');
const BACK_KEYS = ['observations', 'sea', 'uv', 'fire'];
const FACT = { observations: 'Station', uv: 'UV', fire: 'Fire risk', sea: 'Sea' };
const TITLE = { warnings: 'Warnings, now and the next days', forecasts: 'Forecast, five days', observations: 'Nearest station', sea: 'Sea', uv: 'UV index', fire: 'Fire risk' };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = ymd => { const d = new Date(`${ymd}T12:00:00Z`); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const hhmm = iso => { const d = new Date(iso); return isNaN(d) ? null : d.toISOString().slice(11, 16); };

const { res, slow, loads } = loadSix({ onSlow: key => { if (!res[key]) { drawBlock(key); drawBand(); } } });
let current = null, els = null;
const outcome = {};

function block(key) {
  const body = h('div', { class: 'blk-body' });
  const prov = h('div', { class: 'blk-prov' });
  const el = h('section', { class: `pcp-blk pcp-${key}`, id: `pcb-${key}`, 'aria-labelledby': `h-${key}` }, h('h2', { id: `h-${key}`, tabindex: '-1' }, TITLE[key]), body, prov);
  return { el, body, prov };
}

function build(p, msg) {
  const area = areaOf(p);
  const blocks = Object.fromEntries(SOURCES.map(S => [S.key, block(S.key)]));
  const h1 = h('h1', { id: 'pcp-h1', tabindex: '-1' }, p.name);
  const band = h('div', { class: 'pcp-band' });
  const message = h('p', { class: 'pcp-message', 'aria-live': 'polite' }, 'Reading the six files for this town...');
  const stamp = h('div', { class: 'pcp-stamp' });
  const post = h('div', { class: 'pcp-postmark' });
  const facts = h('ul', { class: 'pcp-facts', 'aria-label': 'From the back of the card' });
  const sel = townSelect({ id: 'pcp-town', selected: p.id });
  const form = h('form', { class: 'pcp-pick', action: '/d/postcard/', method: 'get', onsubmit: e => { e.preventDefault(); const id = Number(sel.value); if (id !== current.id) { setTown([id]); show(id, { focus: true }); } } },
    h('label', { for: 'pcp-town' }, 'Another town'), sel, h('button', { type: 'submit', class: 'pcp-btn' }, 'Show'));
  const turn = h('button', { type: 'button', class: 'pcp-btn pcp-turn', 'aria-controls': 'pc-front pc-back', 'aria-expanded': 'false', onclick: () => flip(!isBack(), { record: true, focus: true }) });
  const front = h('div', { class: 'pcp-front', id: 'pc-front' },
    h('div', { class: 'pcp-head' }, h1, h('p', { class: 'pcp-date' }, `${longDate(lisbonNow().slice(0, 10))}, Portugal time`)),
    stamp,
    h('div', { class: 'pcp-msgwrap' }, message),
    post,
    h('div', { class: 'pcp-warn' }, blocks.warnings.el),
    h('div', { class: 'pcp-fc' }, blocks.forecasts.el),
    h('div', { class: 'pcp-side' }, h('p', { class: 'pcp-facts-h' }, 'On the back'), facts));
  const howBody = h('div');
  const copyMsg = h('span', { class: 'muted', role: 'status' });
  const terms = h('div', { class: 'terms-body' }, h('p', { class: 'muted' }, 'Reading the six source cards...'));
  const back = h('div', { class: 'pcp-back', id: 'pc-back', hidden: true },
    h('h2', { class: 'pcp-back-h', id: 'pcp-back-h', tabindex: '-1' }, 'The back of the card'),
    h('div', { class: 'pcp-grid' }, BACK_KEYS.map(k => blocks[k].el)),
    stormLine(p),
    h('details', { class: 'pc-how' }, h('summary', {}, 'How this card was put together'), howBody),
    h('div', { class: 'pcp-address' },
      h('p', {}, h('strong', {}, 'To: '), `${p.name}, warning area ${area?.name || p.area} (${p.area}), forecast place ${p.id}`),
      h('p', { class: 'pc-copy' }, h('button', { type: 'button', class: 'pcp-btn', onclick: () => copyText(location.href, copyMsg, { label: 'Link to this card' }) }, 'Copy link to this card'), ' ', copyMsg)),
    h('section', { class: 'pc-terms', 'aria-labelledby': 'terms' }, h('h2', { id: 'terms', tabindex: '-1' }, 'Terms'), terms));
  const card = h('article', { class: 'pcp-card', 'aria-labelledby': 'pcp-h1' }, front, back);
  root.replaceChildren(...[msg ? h('p', { class: 'status warn pcp-unknown' }, msg) : null, form, band, h('p', { class: 'pcp-turnrow' }, turn), card].filter(Boolean));
  return { h1, band, message, stamp, post, facts, turn, front, back, blocks, howBody, terms };
}

const isBack = () => els && !els.back.hidden;
function flip(toBack, { record = false, focus = false } = {}) {
  if (!els) return;
  els.back.hidden = !toBack; els.front.hidden = toBack;
  els.turn.setAttribute('aria-expanded', String(toBack));
  els.turn.textContent = toBack ? 'Turn back to the front' : 'Turn over: station, sea, UV, fire risk and sources';
  if (record) {
    const u = new URL(location.href);
    if (toBack) u.searchParams.set('side', 'back'); else u.searchParams.delete('side');
    history.replaceState(history.state, '', u.pathname + u.search.replace(/%2C/g, ',') + u.hash);
  }
  if (focus) (toBack ? document.getElementById('pcp-back-h') : els.h1).focus();
}

function drawBlock(key) {
  if (!els || !current) return;
  const B = els.blocks[key];
  B.el.classList.remove('blk-stale', 'blk-old', 'blk-missing');
  const r = renderBlock(key, current, res[key], { slow: slow[key] });
  B.body.replaceChildren(...r.body);
  B.prov.replaceChildren(r.prov);
  if (r.outcome) outcome[key] = r.outcome;
  if (r.mark) B.el.classList.add(`blk-${r.mark}`);
  if (key === 'warnings') drawStamp();
  if (FACT[key]) drawFacts();
}

function drawBand() {
  if (!els) return;
  els.band.replaceChildren(statusBand(SOURCES.map(S => ({ id: S.id, name: S.name, href: `#h-${S.key}`, src: res[S.key] || null, slow: slow[S.key] })), { what: 'files' }).el);
}

// The stamp: the town's warning area level now, from the warnings file only.
function drawStamp() {
  const p = current, src = res.warnings, st = sourceState(src || null, { slow: slow.warnings });
  const area = h('span', { class: 'pcp-area' }, `warning area ${areaName(p.area)}`);
  let level = null, word;
  if (!src) word = st.level === 'slow' ? 'Still reading the warnings' : 'Reading the warnings';
  else if (!src.latest.ok) word = 'Warnings not read';
  else if (!Array.isArray(src.latest.data.active)) word = 'Warnings file changed shape';
  else { level = levelsFor(src.latest.data.active, warningWindows()[0])[p.area]?.level || 'green'; word = level === 'green' ? 'No warning' : levelWord(level); }
  els.stamp.replaceChildren(h('p', { class: 'pcp-stamp-h' }, 'Now'),
    h('p', { class: 'pcp-stamp-l' }, level ? swatch(level) : null, h('strong', {}, word)), area);
  const read = st.readAt ? hhmm(st.readAt) : null;
  els.post.replaceChildren(h('p', { class: `pcp-pm pcp-pm-${st.level}` },
    read ? ['read', h('br'), `${read} UTC`] : st.level === 'missing' ? 'not read' : st.level === 'unknown' ? 'read time unknown' : 'reading',
    st.level === 'stale' || st.level === 'old' ? [h('br'), h('strong', {}, st.level)] : null));
  els.post.setAttribute('aria-label', `Warnings file: ${read ? `read ${read} UTC, ${st.ago}` : st.word}${st.level === 'stale' || st.level === 'old' ? `, ${st.level}` : ''}`);
  els.post.setAttribute('role', 'img');
}

// Facts from the back: each a link that turns the card over to its block, with its source line
// (publisher, source id, read time and state) beside it on the front (review M2); the back keeps the
// full block, its source line and the terms.
function drawFacts() {
  els.facts.replaceChildren(...BACK_KEYS.map(k => {
    const o = outcome[k];
    const how = o?.how || '';
    const txt = !res[k] ? 'reading the file...' : agedClause(k, o?.clause, res[k])
      || (how.startsWith('not read') ? 'not read' : how.startsWith('islands') ? 'IPMA publishes none for the islands'
        : how.includes('beyond') ? `no sea point within ${SEA_NEAR_KM} km` : 'no single value; see the back');
    const S = SOURCES.find(x => x.key === k);
    return h('li', {}, h('a', { href: `#h-${k}` }, h('strong', {}, `${FACT[k]}: `), txt), provLine(res[k] || { id: S.id }, { slow: slow[k] }));
  }));
}

function finish() {
  if (!els || !current) return;
  els.message.textContent = summaryText(current, outcome, res);
  els.terms.replaceChildren(termsBlock(SOURCES.map(S => res[S.key] || { id: S.id })));
  els.howBody.replaceChildren(
    h('p', {}, 'Each block reads one file and picks the record for this town. The joins are in ', h('a', { href: '/assets/js/places.js' }, 'places.js'), '; nothing is copied into this site.'),
    howTable(current, outcome),
    h('p', {}, 'The forecast for this town, in your own JavaScript (no key, CORS open):'),
    h('pre', { class: 'pc-code' }, h('code', {}, fetchSnippet(current))));
}

function show(id, { focus = false, msg = null } = {}) {
  const { places } = placesFromURL(`?id=${id}`);
  const p = places[0];
  current = p;
  for (const k of Object.keys(outcome)) delete outcome[k];
  els = build(p, msg);
  flip(new URLSearchParams(location.search).get('side') === 'back');
  for (const S of SOURCES) drawBlock(S.key);
  drawBand();
  document.title = `${p.name}, ${NAME} design | Weather, from our data`;
  if (mainLink) mainLink.href = `/place/?id=${p.id}`;
  keepTown(p);
  if (focus) els.h1.focus();
  const me = p;
  for (const S of SOURCES) loads[S.key].then(() => { if (current === me) { drawBlock(S.key); drawBand(); } });
  Promise.all(SOURCES.map(S => loads[S.key])).then(() => { if (current === me) finish(); });
}

// A link to a block on the hidden side turns the card over and moves focus to that block.
root.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || !els) return;
  const t = document.getElementById(a.getAttribute('href').slice(1));
  if (!t) return;
  const side = els.back.contains(t) ? 'back' : els.front.contains(t) ? 'front' : null;
  if (!side) return;
  e.preventDefault();
  if ((side === 'back') !== isBack()) flip(side === 'back', { record: true });
  t.focus(); t.scrollIntoView({ block: 'start' });
});

function fromURL({ focus = false } = {}) {
  const { places, unknown } = placesFromURL(location.search);
  const msg = unknown.length ? `No town has the id ${unknown[0].slice(0, 20)}; showing ${places[0].name}.` : null;
  show(places[0].id, { focus, msg });
}
addEventListener('popstate', () => fromURL({ focus: true }));
fromURL();
