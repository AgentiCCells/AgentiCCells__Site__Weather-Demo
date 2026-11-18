const r = await fetch('https://data.promptugal.news/api/v1/index.json');
const index = await r.json();
for (const s of index.sources) console.log(s.id, s.cadence, s.read_at);
