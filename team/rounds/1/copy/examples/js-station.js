const r = await fetch('https://data.promptugal.news/api/v1/ipma-observations/latest.json');
const o = await r.json();
const km = (lat1, lon1, lat2, lon2) => { // great-circle distance
  const k = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * k / 2) ** 2
    + Math.cos(lat1 * k) * Math.cos(lat2 * k) * Math.sin((lon2 - lon1) * k / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};
const here = { lat: 37.0146, lon: -7.9331 }; // Faro
const near = o.stations.filter(s => s.reading)
  .map(s => ({ ...s, km: km(here.lat, here.lon, s.lat, s.lon) }))
  .sort((a, b) => a.km - b.km)[0];
console.log(near.name, near.km.toFixed(1), 'km away; hour (UTC):', o.hour_utc, near.reading);
