// pages/uv.js: IPMA's UV index forecast by place and day, coloured by the WHO bands, with the
// value written in every cell. Where IPMA's file gives two values for one place and day, the cell
// splits and shows both; nothing is averaged or dropped. Places without a name are shown by id.
// ES module. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance B), 2026-11-18, round 1.
// Adapted from AgentiCCells/AgentiCCells__Site__IPMA-Data, src/assets/js/pages/uv.js (commit 44ed7f8),
// Apache-2.0, same organisation, by developer.weather-demo@AgentiCCells.dinis (instance B), 2026-11-18,
// round 1: row names whose id is a town of PLACES link to /place/?id=<globalIdLocal>, and a line lists
// the towns that borrow another place's value (places.js findUV) (design proposal 3.6).
import { loadSource, ageBanner, provenance, runStrip, loading, failure, fmtDay, h } from '../data.js';
import { UV_BANDS, uvBand } from '../codes.js';
import { PLACES, placeById, findUV } from '../places.js';

const ID = 'ipma-uv';
const WHAT = "IPMA's UV index forecast (ipma-uv)";
const IPMA_PAGE = 'https://www.ipma.pt/en/otempo/prev.uv/';
const REGIONS = [['mainland', 'Mainland'], ['madeira', 'Madeira'], ['azores', 'Azores']];

const lisbonToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// replaceChildren() would turn null into the text "null" and an array into a string: flatten and drop empties.
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false && k !== ''));
const fin = v => v !== null && v !== undefined && Number.isFinite(Number(v));
// IPMA's globalIdLocal starts with 1 on the mainland, 2 in Madeira and 3 in the Azores.
// A place without a name is not put in a region: the page does not guess where it is.
const regionOf = p => p.name ? (({ 1: 'mainland', 2: 'madeira', 3: 'azores' })[String(p.id)[0]] || null) : null;
const bandIdx = v => { const b = uvBand(v); return b ? UV_BANDS.indexOf(b) + 1 : 0; };

// The stale or old line above the chart (data.js ageBanner), as on every data page.
const AGE = { page: IPMA_PAGE };

function valueCell(v) {
  if (!fin(v)) return h('span', { class: 'uv-v' }, 'no value');
  const b = uvBand(v);
  return h('span', { class: `uv-v uv-b${bandIdx(v)}`, title: b ? `UV ${v}: ${b.name}` : `UV ${v}` }, String(v), h('span', { class: 'cb-vh' }, b ? ` ${b.name}` : ''));
}

async function main() {
  const root = document.getElementById('uv');
  const runsEl = document.getElementById('uv-runs');
  const slow = loading(root, "IPMA's UV index forecast");
  const src = await loadSource(ID, { reads: true, onSlow: slow });
  runsEl.replaceChildren(runStrip(src.reads));
  if (!src.latest.ok) { failure(root, WHAT, src.latest, IPMA_PAGE); return; }
  const L = src.latest.data;
  const all = Array.isArray(L.places) ? L.places : [];
  if (!all.length) {
    put(root, h('p', { class: 'status', role: 'status' }, 'The UV file was read but lists no places, so there is nothing to draw.'), provenance(src));
    return;
  }
  const today = lisbonToday();
  const allDates = [...new Set(all.flatMap(p => (p.days || []).map(d => d.date)))].filter(Boolean).sort();
  const dates = allDates.filter(d => d >= today);
  const past = allDates.length - dates.length;
  if (!dates.length) {
    put(root, ageBanner(src.latest, AGE), h('p', { class: 'status', role: 'status' },
      `Every day in the file is before today (${fmtDay(today)}, Lisbon date), so there is no current UV forecast to draw. See `, h('a', { href: IPMA_PAGE }, 'IPMA'), '.'), provenance(src));
    return;
  }

  // Place id 0 is not a place: IPMA documents no place 0, and it carries several values a day.
  const zero = all.filter(p => Number(p.id) === 0);
  const places = all.filter(p => Number(p.id) !== 0);
  const unnamed = places.filter(p => !p.name);
  const doubled = new Set();
  const byRegion = REGIONS.map(([key, label]) => [key, label, places.filter(p => (regionOf(p) || 'other') === key).sort((a, b) => Number(a.id) - Number(b.id))]);
  const other = places.filter(p => !regionOf(p));
  if (other.length) byRegion.push(['other', "Without a name in IPMA's file", other.sort((a, b) => Number(a.id) - Number(b.id))]);

  const head = h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Place'), dates.map(d => h('th', { scope: 'col' }, d === today ? `Today, ${fmtDay(d)}` : fmtDay(d)))));
  const body = h('tbody', {});
  for (const [, label, list] of byRegion) {
    if (!list.length) continue;
    body.append(h('tr', { class: 'uv-region' }, h('th', { scope: 'colgroup', colspan: String(dates.length + 1) }, label)));
    for (const p of list) {
      const town = placeById(p.id);
      const name = town ? h('a', { href: `/place/?id=${town.id}` }, p.name || town.name)
        : p.name ? p.name : [`IPMA id ${p.id}`, h('small', {}, "no name in IPMA's file")];
      body.append(h('tr', {}, h('th', { scope: 'row' }, name),
        dates.map(date => {
          const vals = (p.days || []).filter(d => d.date === date).map(d => d.index);
          if (!vals.length) return h('td', {}, h('span', { class: 'uv-none' }, 'no value'));
          if (vals.length > 1) doubled.add(p.name || `IPMA id ${p.id}`);
          return h('td', {}, h('div', { class: 'uv-split' }, vals.map(valueCell)),
            vals.length > 1 ? h('span', { class: 'cb-vh' }, `: ${vals.length} values given for this day`) : null);
        })));
    }
  }

  const maxV = Math.max(...places.flatMap(p => (p.days || []).filter(d => dates.includes(d.date)).map(d => d.index)).filter(fin).map(Number));
  const hoursKnown = all.some(p => (p.days || []).some(d => d.hours));

  // Towns of PLACES with no UV value of their own: findUV gives the nearest place that has one.
  const borrow = new Map();
  for (const t of PLACES) {
    const f = findUV(t, L);
    if (!f || f.exact) continue;
    const k = f.place.name;
    if (!borrow.has(k)) borrow.set(k, []);
    borrow.get(k).push(`${t.name} (${f.km} km)`);
  }
  const noUV = PLACES.filter(t => !findUV(t, L));
  const join = a => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
  const borrowLine = borrow.size ? h('p', { class: 'cb-note' }, `IPMA gives no UV for ${[...borrow.values()].flat().length} towns of `, h('a', { href: '/place/' }, 'Your town'),
    `, which shows the nearest place that has one instead, with its distance: ${[...borrow].map(([k, v]) => `${join(v)} ${v.length === 1 ? 'uses' : 'use'} ${k}'s value`).join('; ')}.${noUV.length ? ` ${join(noUV.map(t => t.name))}: no UV place found.` : ''} Distances are straight lines between the places' positions in this site's town table.`) : null;

  const zeroBlock = zero.length ? h('details', { class: 'cb-more' },
    h('summary', {}, `IPMA id 0: ${zero.reduce((n, p) => n + (p.days || []).length, 0)} values with no place`),
    h('p', { class: 'cb-note' }, "IPMA's file has an entry with id 0, no name and several values for each day. IPMA's documentation lists no place 0, so it cannot be put on a row and is not drawn in the grid. Its values, as given:"),
    h('ul', { class: 'cb-note' }, dates.map(date => {
      const v = zero.flatMap(p => (p.days || []).filter(d => d.date === date).map(d => d.index));
      return h('li', {}, `${fmtDay(date)}: ${v.length ? v.join(', ') : 'none'}`);
    }))) : null;

  put(root, 
    ageBanner(src.latest, AGE),
    h('figure', { class: 'chart' },
      h('div', { class: 'cb-scroll', tabindex: '0', role: 'region', 'aria-label': 'UV index by place and day' },
        h('table', { class: 'uv-grid' }, h('caption', { class: 'cb-vh' }, "IPMA's UV index forecast by place and day, with the WHO band of each value."), head, body)),
      h('figcaption', {},
        h('ul', { class: 'cb-legend', 'aria-label': 'WHO UV index bands' },
          UV_BANDS.map((b, i) => h('li', {}, h('span', { class: `cb-sw uv-b${i + 1}` }), `${b.name} (${b.who_range})`))),
        "Colour: the WHO UV index band; the value is written in every cell. IPMA gives the index with one decimal; values from 0 up to 3 count as Low, and the band edges are IPMA's (3, 6, 8, 11). Regions in IPMA's id order.")),
    h('p', { class: 'cb-note' },
      `${places.length} places with an id in IPMA's file, ${dates.length} days from ${fmtDay(dates[0])} to ${fmtDay(dates[dates.length - 1])}. Highest value shown: ${Number.isFinite(maxV) ? maxV : 'none'}.`,
      past ? ` ${past} day${past === 1 ? '' : 's'} before today (Lisbon date) ${past === 1 ? 'is' : 'are'} left out.` : '',
      doubled.size ? ` ${[...doubled].join(', ')} ${doubled.size === 1 ? 'has' : 'have'} two values for a day in IPMA's file, with nothing to tell them apart; the cell splits and shows both. Neither is dropped and they are not averaged.` : '',
      unnamed.length ? ` ${unnamed.map(p => `IPMA id ${p.id}`).join(', ')} ${unnamed.length === 1 ? 'has' : 'have'} no name in IPMA's file or its list of places, so ${unnamed.length === 1 ? 'it is' : 'they are'} shown by id. The page does not guess the place.` : '',
      hoursKnown ? '' : " IPMA's file gives no hours for the UV maximum (the field is empty), so none are shown.",
      ' A place name that is a link opens that town in Your town.'),
    borrowLine,
    zeroBlock,
    provenance(src));
}

main().catch(e => {
  const root = document.getElementById('uv');
  if (root) failure(root, WHAT, { error: `the page could not draw the file (${e.message})` }, IPMA_PAGE);
});
