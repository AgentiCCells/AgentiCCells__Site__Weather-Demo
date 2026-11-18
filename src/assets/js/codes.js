// codes.js: small lookup tables for IPMA's codes (areas, weather types, classes, levels).
// Code tables only, not IPMA data: every value on a page still comes from a file read live.
// Each table names its source and the time it was read. ES module, no dependencies. Code Apache-2.0.
// Written by analyst.ipma-data@AgentiCCells.dinis, 2026-11-18, round 1. Notes: team/rounds/1/data/NOTES.md.

// ---------- warning areas ----------
// The 25 warning area codes (idAreaAviso) and their names as IPMA writes them.
// Source: IPMA's warnings page, https://www.ipma.pt/pt/otempo/prev-sam/ (names) and
// https://www.ipma.pt/en/otempo/prev-sam/ (name_en), both read 2026-11-18 at 10:57 UTC.
// District numbers: IPMA's https://api.ipma.pt/open-data/distrits-islands.json (idDistrito with
// idAreaAviso), read 2026-11-18 at 10:55 UTC; they match the first two digits of the DICO codes in
// ipma-fire-risk latest.json (checked on all 24 mainland places in that file). Madeira and the Azores
// have no DICO district in any file we read, so district is null there.
export const AREAS = {
  AVR: { name: 'Aveiro', name_en: 'Aveiro', region: 'mainland', district: '01' },
  BJA: { name: 'Beja', name_en: 'Beja', region: 'mainland', district: '02' },
  BRG: { name: 'Braga', name_en: 'Braga', region: 'mainland', district: '03' },
  BGC: { name: 'Bragança', name_en: 'Bragança', region: 'mainland', district: '04' },
  CBO: { name: 'Castelo Branco', name_en: 'Castelo Branco', region: 'mainland', district: '05' },
  CBR: { name: 'Coimbra', name_en: 'Coimbra', region: 'mainland', district: '06' },
  EVR: { name: 'Évora', name_en: 'Évora', region: 'mainland', district: '07' },
  FAR: { name: 'Faro', name_en: 'Faro', region: 'mainland', district: '08' },
  GDA: { name: 'Guarda', name_en: 'Guarda', region: 'mainland', district: '09' },
  LRA: { name: 'Leiria', name_en: 'Leiria', region: 'mainland', district: '10' },
  LSB: { name: 'Lisboa', name_en: 'Lisboa', region: 'mainland', district: '11' },
  PTG: { name: 'Portalegre', name_en: 'Portalegre', region: 'mainland', district: '12' },
  PTO: { name: 'Porto', name_en: 'Porto', region: 'mainland', district: '13' },
  STM: { name: 'Santarém', name_en: 'Santarém', region: 'mainland', district: '14' },
  STB: { name: 'Setúbal', name_en: 'Setúbal', region: 'mainland', district: '15' },
  VCT: { name: 'Viana do Castelo', name_en: 'Viana do Castelo', region: 'mainland', district: '16' },
  VRL: { name: 'Vila Real', name_en: 'Vila Real', region: 'mainland', district: '17' },
  VIS: { name: 'Viseu', name_en: 'Viseu', region: 'mainland', district: '18' },
  MCN: { name: 'Madeira-Costa Norte', name_en: 'Madeira - North Coast', region: 'madeira', district: null },
  MRM: { name: 'Madeira-R. Montanhosas', name_en: 'Madeira - Mountain', region: 'madeira', district: null },
  MCS: { name: 'Madeira-Costa Sul', name_en: 'Madeira - South Coast', region: 'madeira', district: null },
  MPS: { name: 'Madeira-Porto Santo', name_en: 'Madeira - Porto Santo', region: 'madeira', district: null },
  AOC: { name: 'Açores - G. Ocidental', name_en: 'Azores - Ocidental G.', region: 'azores', district: null },
  ACE: { name: 'Açores - G. Central', name_en: 'Azores - Central G.', region: 'azores', district: null },
  AOR: { name: 'Açores - G. Oriental', name_en: 'Azores - Oriental G.', region: 'azores', district: null },
};

// DICO district (first two digits of a municipality's DICO code) -> warning area code.
// Derived from AREAS above (same sources). Mainland only: 278 municipalities in ipma-fire-risk.
export const DICO_TO_AREA = Object.fromEntries(
  Object.entries(AREAS).filter(([, a]) => a.district).map(([code, a]) => [a.district, code]));

// The warning area for a DICO code such as "1106", or null.
export const areaForDico = dico => DICO_TO_AREA[String(dico ?? '').slice(0, 2)] || null;

// ---------- warning levels ----------
// Plain meanings as IPMA states them. Source: https://www.ipma.pt/en/enciclopedia/otempo/sam/index.html
// (en) and https://www.ipma.pt/pt/enciclopedia/otempo/sam/index.html (pt), read 2026-11-18 at 10:57 UTC.
// Note: for red, IPMA's English page says "high risk" and its Portuguese page "risco extremo".
export const WARNING_LEVELS = {
  green: { rank: 0, name: 'Green', name_pt: 'Verde', meaning: 'No hazardous weather conditions foreseen.', advice: null },
  yellow: { rank: 1, name: 'Yellow', name_pt: 'Amarelo', meaning: 'Weather sensitive activities may be affected.', advice: 'Pay attention to the development of weather conditions.' },
  orange: { rank: 2, name: 'Orange', name_pt: 'Laranja', meaning: 'Weather conditions involving moderate to high risk.', advice: 'Keep informed of their development and follow the advice of the Civil Protection Authorities ANEPC.' },
  red: { rank: 3, name: 'Red', name_pt: 'Vermelho', meaning: 'Weather conditions involving high risk.', advice: 'Keep informed of their development and follow the advice of the Civil Protection Authorities ANEPC.' },
};

// ---------- warning types ----------
// Keyed by IPMA's Portuguese type name (type_pt in ipma-warnings latest.json, awarenessTypeName in
// IPMA's file). `data` is the English label ipma-warnings latest.json uses (type), where seen on
// 2026-11-18 at 10:11 UTC read; null where that type was not active, so the label is not known.
// `ipma_en` is the legend of https://www.ipma.pt/en/otempo/prev-sam/, read 2026-11-18 at 10:57 UTC.
// The eight types are those in IPMA's warnings_www.json (read 2026-11-18 at 10:56 UTC) and on api.ipma.pt.
export const WARNING_TYPES = {
  'Agitação Marítima': { data: 'rough sea', ipma_en: 'Coastal Event' },
  'Precipitação': { data: 'rain', ipma_en: 'Rain' },
  'Vento': { data: null, ipma_en: 'Wind' },
  'Trovoada': { data: null, ipma_en: 'Thunderstorm' },
  'Neve': { data: null, ipma_en: 'Snow' },
  'Nevoeiro': { data: null, ipma_en: 'Fog' },
  'Tempo Frio': { data: null, ipma_en: 'Low Temperature' },
  'Tempo Quente': { data: null, ipma_en: 'High Temperature' },
};

// ---------- forecasts ----------
// IPMA idWeatherType -> English description, as IPMA gives it (descWeatherTypeEN, with IPMA's own
// spelling; trailing space trimmed). Source: https://api.ipma.pt/open-data/weather-type-classe.json,
// read 2026-11-18 at 10:55 UTC. -99 ("--") is IPMA's no-data value: treat it as missing.
export const WEATHER_TYPES = {
  0: 'No information', 1: 'Clear sky', 2: 'Partly cloudy', 3: 'Sunny intervals', 4: 'Cloudy',
  5: 'Cloudy (High cloud)', 6: 'Showers/rain', 7: 'Light showers/rain', 8: 'Heavy showers/rain',
  9: 'Rain/showers', 10: 'Light rain', 11: 'Heavy rain/showers', 12: 'Intermittent rain',
  13: 'Intermittent ligth rain', 14: 'Intermittent heavy rain', 15: 'Drizzle', 16: 'Mist', 17: 'Fog',
  18: 'Snow', 19: 'Thunderstorms', 20: 'Showers and thunderstorms', 21: 'Hail', 22: 'Frost',
  23: 'Rain and thunderstorms', 24: 'Convective clouds', 25: 'Partly cloudy', 26: 'Fog', 27: 'Cloudy',
  28: 'Snow showers', 29: 'Rain and snow', 30: 'Rain and snow',
};

// Daily wind speed class (wind_class) -> name. Source: https://api.ipma.pt/open-data/wind-speed-daily-classe.json,
// read 2026-11-18 at 10:55 UTC. IPMA gives no speeds for the classes, only names.
export const WIND_CLASS = { 1: 'Weak', 2: 'Moderate', 3: 'Strong', 4: 'Very strong' };

// Daily precipitation intensity class (rain_class) -> name. Source: https://api.ipma.pt/open-data/precipitation-classe.json,
// read 2026-11-18 at 10:55 UTC. In ipma-city-forecasts, rain_class is null on days IPMA gives no class
// (63 of 175 place-days on the 10:09 UTC read); null is not the same as 0 ("No precipitation").
export const RAIN_CLASS = { 0: 'No precipitation', 1: 'Weak', 2: 'Moderate', 3: 'Strong' };

// ---------- observations ----------
// wind_dir_id (IPMA idDireccVento) -> compass point. Confirmed from IPMA's API page https://api.ipma.pt/
// (section "Observação Meteorológica de Estações"), read 2026-11-18 at 10:57 UTC: "0: sem rumo, 1 ou 9: N,
// 2: NE, 3: E, 4: SE, 5: S, 6: SW, 7: W, 8: NW". 0 means no direction (calm or none), so it maps to null.
export const WIND_DIR_ID = { 0: null, 1: 'N', 2: 'NE', 3: 'E', 4: 'SE', 5: 'S', 6: 'SW', 7: 'W', 8: 'NW', 9: 'N' };
export const WIND_DIR_ID_CONFIRMED = true;

// ---------- fire risk ----------
// RCM class (rcm) -> name. `data` is the level string in ipma-fire-risk latest.json (only "low" was seen
// on 2026-11-18 at 10:11 UTC: every municipality was class 1, so the strings for 2 to 5 are not known yet).
// `name` is IPMA's English label on https://www.ipma.pt/en/riscoincendio/rcm.pt/ (read 2026-11-18 at 10:58 UTC);
// `name_pt` is from https://api.ipma.pt/ (read 2026-11-18 at 10:57 UTC).
export const RCM_LEVELS = {
  1: { data: 'low', name: 'Low', name_pt: 'Risco reduzido' },
  2: { data: null, name: 'Moderate', name_pt: 'Risco moderado' },
  3: { data: null, name: 'High', name_pt: 'Risco Elevado' },
  4: { data: null, name: 'Very High', name_pt: 'Risco muito elevado' },
  5: { data: null, name: 'Highest', name_pt: 'Risco máximo' },
};

// ---------- UV ----------
// UV index bands. Names and whole-number ranges: WHO, "Global Solar UV Index: A Practical Guide" (2002)
// (not re-read online in this session); WHO's page https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index
// (read 2026-11-18 at 11:01 UTC) gives the action groups 0 to 2, 3 to 7, 8 and above, which agree.
// Lower bounds as IPMA applies them to decimal values (">= 11: Extremo >= 8: Muito elevado >= 6: Elevado
// >=3: Moderado >=1: Baixo", https://api.ipma.pt/, read 2026-11-18 at 10:57 UTC). IPMA names no band
// below 1; here values from 0 up to 3 count as Low. min is inclusive, max exclusive.
export const UV_BANDS = [
  { name: 'Low', name_pt: 'Baixo', min: 0, max: 3, who_range: '0 to 2' },
  { name: 'Moderate', name_pt: 'Moderado', min: 3, max: 6, who_range: '3 to 5' },
  { name: 'High', name_pt: 'Elevado', min: 6, max: 8, who_range: '6 to 7' },
  { name: 'Very high', name_pt: 'Muito elevado', min: 8, max: 11, who_range: '8 to 10' },
  { name: 'Extreme', name_pt: 'Extremo', min: 11, max: Infinity, who_range: '11 and above' },
];
export const uvBand = v => (v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0)
  ? null : UV_BANDS.find(b => Number(v) >= b.min && Number(v) < b.max);
