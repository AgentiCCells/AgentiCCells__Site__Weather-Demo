const r = await fetch('https://data.promptugal.news/api/v1/ipma-warnings/latest.json');
const w = await r.json();
console.log(`read at ${w.read_at}: ${w.counts.active} active warnings`);
for (const a of w.active) console.log(a.level, a.area_name, a.type, a.start, a.end);
