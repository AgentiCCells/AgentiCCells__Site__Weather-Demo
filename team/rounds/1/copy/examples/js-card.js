const r = await fetch('https://data.promptugal.news/api/v1/ipma-warnings/card.json');
const card = await r.json();
console.log(card.publisher);
console.log(card.schedule.cadence, '|', card.terms.summary);
console.log('terms page:', card.terms.page, '| terms read on', card.terms.read_at);
