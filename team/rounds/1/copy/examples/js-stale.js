const r = await fetch('https://data.promptugal.news/api/v1/ipma-warnings/latest.json');
const w = await r.json();
const hours = (Date.now() - Date.parse(w.read_at)) / 36e5;
console.log(hours > 3
  ? `Stale: this file was read ${hours.toFixed(1)} hours ago`
  : `Read ${Math.round(hours * 60)} minutes ago`);
