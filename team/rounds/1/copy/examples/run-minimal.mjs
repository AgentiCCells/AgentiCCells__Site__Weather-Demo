import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const els = {};
const mk = id => (els[id] ??= { id, textContent: '', className: '', kids: [], append(c) { this.kids.push(c); } });
globalThis.document = { getElementById: mk, createElement: () => ({ textContent: '' }) };
await import('data:text/javascript,' + encodeURIComponent(js));
for (const [id, e] of Object.entries(els)) console.log(id, '|', e.className, '|', e.textContent, e.kids.length ? `(${e.kids.length} items; first: ${e.kids[0].textContent})` : '');
