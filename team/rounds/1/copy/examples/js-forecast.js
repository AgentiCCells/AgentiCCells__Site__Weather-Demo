const r = await fetch('https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json');
const f = await r.json();
const place = f.cities.find(c => c.id === 1080500); // IPMA's globalIdLocal for Faro
console.log(place.name, 'read at', place.read_at);
console.table(place.days.map(d => ({ date: d.date, min: d.t_min_c, max: d.t_max_c, rain: d.rain_prob_pct })));
