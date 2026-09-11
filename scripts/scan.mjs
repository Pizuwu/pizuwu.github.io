#!/usr/bin/env node
// 996-Schnellscan: holt Portale per curl, extrahiert Kandidaten <=33k,
// dedupet gegen seen-listings + bereits gemeldete, druckt NUR neue Kandidaten
// (eine JSON-Zeile pro Fund) und sammelt sie in data/pending-candidates.json.
// Verifikation und Mail macht Claude nach dem Wake-up, nie dieses Skript.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const CYCLE = parseInt(process.env.CYCLE || '0', 10);
const MAX_EUR = 45000; // Beobachtungsgrenze Winterfenster
const ALERT_EUR = 32000; // Glueckstreffer-Zone fuer Sofort-Alert

// Tippfehler-Rotation fuer kleinanzeigen (exakte Suche, 1 Abruf pro Stunde):
// jeder Stunden-Slot nimmt die naechste Query, Tippfehler-Inserate haben weniger Konkurrenz
const KA_QUERIES = [
  'preis::45000/porsche-targa', 'preis::45000/porsche-911-sc', 'preis::45000/porsche-g-modell',
  'preis::45000/porsche-oldtimer', 'preis::45000/porsche-964', 'preis::45000/porsche-912',
  'preis::45000/porshe', 'preis::45000/porche', 'preis::45000/carera', 'preis::45000/porsche-911-targa',
];
const kaSlot = Math.floor(CYCLE / 12) % KA_QUERIES.length;

const SOURCES = [
  { key: 'as24-de', everyN: 1, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=D&sort=age&desc=1' },
  { key: 'as24-at', everyN: 1, type: 'as24', base: 'https://www.autoscout24.at',
    url: 'https://www.autoscout24.at/lst/porsche/911?atype=C&priceto=45000&fregto=1994&sort=age&desc=1' },
  { key: 'as24-912', everyN: 2, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/912?atype=C&priceto=45000&cy=D%2CA%2CNL%2CB%2CF%2CI&sort=age&desc=1' },
  { key: 'as24-nb', everyN: 1, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=NL%2CB%2CF%2CI%2CL&sort=age&desc=1' },
  { key: 'willhaben', everyN: 1, type: 'wh', base: 'https://www.willhaben.at/iad/',
    url: 'https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse?CAR_MODEL%2FMAKE=Porsche&PRICE_TO=45000&YEAR_MODEL_TO=1994' },
  { key: '12gw', everyN: 1, type: 'gw', base: 'https://www.12gebrauchtwagen.de',
    url: 'https://www.12gebrauchtwagen.de/auto/porsche/911' },
  { key: 'ct-g-modell', everyN: 2, type: 'ct', base: 'https://www.classic-trader.com',
    url: 'https://www.classic-trader.com/de/automobile/suche/porsche/911/g-modell?sort=price_asc' },
  { key: 'ct-urmodell', everyN: 2, type: 'ct', base: 'https://www.classic-trader.com',
    url: 'https://www.classic-trader.com/de/automobile/suche/porsche/911/urmodell?sort=price_asc' },
  { key: 'ct-912', everyN: 3, type: 'ct', base: 'https://www.classic-trader.com',
    url: 'https://www.classic-trader.com/de/automobile/suche/porsche/912?sort=price_asc' },
  { key: 'marktplaats', everyN: 2, type: 'mp', base: 'https://www.marktplaats.nl',
    url: 'https://www.marktplaats.nl/q/porsche+targa/' },
  { key: '2dehands', everyN: 2, type: 'mp', base: 'https://www.2dehands.be',
    url: 'https://www.2dehands.be/q/porsche+targa/' },
  // kleinanzeigen nur jeden 12. Zyklus (~stuendlich bei 5-Min-Takt), sonst IP-Sperre; Query rotiert
  { key: 'kleinanzeigen', everyN: 12, type: 'ka', base: 'https://www.kleinanzeigen.de',
    url: 'https://www.kleinanzeigen.de/s-autos/' + KA_QUERIES[kaSlot] + '/k0c216' },
];
const NICHT_911 = /cayenn?e|macann?|panamera?|boxster|cayman|taycan|914|924|944|928|968|996|997|991|992|993|carrera gt|junior|traktor|diesel/i;
// Karosserien, Projekte, Teile: fliegen komplett raus (Patrick will NUR fahrbereite Autos)
const PROJEKT = /frame|carrosserie|body.?(chassis|shell)|karosserie\b|rolling|schlacht|ersatzteil|onderdel|teiletr|restauratie|restaurations?basis|restoration|te restaureren|gerestaureerd worden|projec?t\b|projekt|basis\b|ohne motor|zonder motor|no engine|motorschaden|unfall|accident|gereviseerd worden|barn find|scheunenfund/i;
const IST_911 = /911|912|964|targa|oldtimer|g.?modell|\bsc\b|porshe|porche|posche|porsch\b|carera|carrerra/i;

function fetch(url) {
  try {
    return execFileSync('curl', ['-sS', '-L', '--max-time', '25', '--compressed',
      '-o', '-', '-w', '', url], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
  } catch (e) { return null; }
}
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fuzzy = l => norm(l.title).slice(0, 25) + '|' + Math.round(l.price_eur / 100) + '|' + Math.round((l.km || 0) / 2000);
const yearOk = ez => { const m = /(19\d{2})/.exec(ez || ''); return !m || (+m[1] >= 1960 && +m[1] <= 1994); };

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}
function parseAs24(html, base) {
  const j = nextData(html); if (!j) return [];
  const ls = j?.props?.pageProps?.listings || [];
  return ls.map(l => {
    const ez = (l.vehicleDetails || []).find(d => /Erstzulassung/i.test(d.ariaLabel || ''))?.data || '';
    return {
      title: [l.vehicle?.model, l.vehicle?.modelVersionInput || l.vehicle?.variant].filter(Boolean).join(' ').slice(0, 90),
      price_eur: l.price?.priceRaw ?? null,
      km: parseInt(String(l.vehicle?.mileageInKm || '').replace(/\D/g, ''), 10) || null,
      ez, location: [l.location?.zip, l.location?.city].filter(Boolean).join(' '),
      country: l.location?.countryCode || '', seller: l.seller?.type || '',
      url: l.url?.startsWith('http') ? l.url : base + l.url, src: 'as24',
    };
  }).filter(l => l.url && l.price_eur && l.price_eur <= MAX_EUR && yearOk(l.ez));
}
function parseWh(html) {
  const j = nextData(html); if (!j) return [];
  const ads = j?.props?.pageProps?.searchResult?.advertSummaryList?.advertSummary || [];
  return ads.map(a => {
    const at = {}; (a.attributes?.attribute || []).forEach(x => at[x.name] = (x.values || []).join('|'));
    return {
      title: a.description || '', price_eur: Math.round(parseFloat(at['PRICE/AMOUNT'] || '0')),
      km: parseInt(at['MILEAGE'] || '', 10) || null, ez: at['YEAR_MODEL'] || '',
      location: at['ADDRESS'] || at['LOCATION'] || '', country: 'AT',
      seller: at['AUTDEALER'] === '1' ? 'Haendler' : 'privat',
      url: at['SEO_URL'] ? 'https://www.willhaben.at/iad/' + at['SEO_URL'] : '', src: 'willhaben',
      make: at['CAR_MODEL/MAKE'] || '',
    };
  }).filter(l => l.url && /porsche/i.test(l.make) && /911|996/i.test(l.title)
    && l.price_eur > 0 && l.price_eur <= MAX_EUR && yearOk(l.ez));
}
function parseGw(html) {
  const out = []; const re = /offer_id=(\d+)/g; let m; const seen = new Set();
  while ((m = re.exec(html))) {
    if (seen.has(m[1])) continue; seen.add(m[1]);
    const ctx = html.slice(Math.max(0, m.index - 2500), m.index + 500);
    const price = /([\d.]{4,9})\s*(?:€|&euro;|EUR)/.exec(ctx) || /(?:€|&euro;)\s*([\d.]{4,9})/.exec(ctx);
    const km = /([\d.]{3,8})\s*km/i.exec(ctx);
    const ez = /\b(\d{2}\/\d{4})\b/.exec(ctx);
    const title = /Porsche[^<>"]{0,80}/.exec(ctx.replace(/\s+/g, ' '));
    const p = price ? parseInt(price[1].replace(/\./g, ''), 10) : null;
    if (!p || p < 8000 || p > MAX_EUR) continue;
    out.push({ title: (title ? title[0] : 'Porsche 911').trim(), price_eur: p,
      km: km ? parseInt(km[1].replace(/\./g, ''), 10) : null, ez: ez ? ez[1] : '',
      location: '', country: 'DE', seller: '',
      url: 'https://www.12gebrauchtwagen.de/c/partner?offer_id=' + m[1], src: '12gw' });
  }
  return out.filter(l => yearOk(l.ez) && !NICHT_911.test(l.title));
}
function parseKa(html) {
  if (/IP-Bereich/i.test(html || '')) return null; // gesperrt, kein Fehler
  const out = [];
  const arts = (html || '').split(/<article/).slice(1);
  for (const a of arts) {
    const href = /data-href="([^"]+)"/.exec(a); if (!href) continue;
    if (/Suche|Ankauf|suche/i.test((/class="ellipsis"[^>]*>([^<]+)</.exec(a) || [])[1] || '') &&
        /Gesuch/i.test(a)) continue;
    const title = /class="ellipsis"[^>]*>\s*([^<]+)/.exec(a);
    const price = /([\d.]{4,9})\s*€/.exec(a);
    const km = /([\d.]{3,8})\s*km/.exec(a);
    const ez = /EZ\s*(\d{2}\/\d{4})/.exec(a);
    const loc = /aditem-main--top--left[^>]*>\s*([^<]+)/.exec(a);
    const p = price ? parseInt(price[1].replace(/\./g, ''), 10) : null;
    if (!p || p < 8000 || p > MAX_EUR) continue;
    // Titel notfalls aus dem URL-Slug ableiten, sonst greifen die Modell-Filter nicht
    var slugTitle = href[1].replace(/^\/s-anzeige\//, '').split('/')[0].replace(/-/g, ' ');
    out.push({ title: title ? title[1].trim() : slugTitle, price_eur: p,
      km: km ? parseInt(km[1].replace(/\./g, ''), 10) : null, ez: ez ? ez[1] : '',
      location: loc ? loc[1].trim() : '', country: 'DE', seller: '',
      url: 'https://www.kleinanzeigen.de' + href[1], src: 'kleinanzeigen' });
  }
  return out.filter(l => IST_911.test(l.title) && !NICHT_911.test(l.title) && yearOk(l.ez));
}
function parseCt(html) {
  // classic-trader: ld+json SearchResultsPage mit ItemList von Car-Objekten
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    if (j['@type'] !== 'SearchResultsPage') continue;
    for (const li of (j.mainEntity?.[0]?.itemListElement || [])) {
      const c = li.item; if (!c || c['@type'] !== 'Car') continue;
      const yr = parseInt((c.name || '').slice(0, 4), 10) || c.vehicleModelDate || null;
      out.push({
        title: (c.name || '').replace(/^\d{4}\s*\|\s*/, '') + (yr ? ' (' + yr + ')' : ''),
        price_eur: Math.round(parseFloat(c.offers?.price || '0')),
        km: Math.round(c.mileageFromOdometer?.value || 0) || null,
        ez: String(yr || ''), location: c.offers?.seller?.name || '', country: '',
        seller: 'Haendler/classic-trader', url: c.url || '', src: 'classic-trader',
      });
    }
  }
  return out.filter(l => l.url && l.price_eur >= 8000 && l.price_eur <= MAX_EUR && yearOk(l.ez));
}
function parseMp(html, base) {
  const j = nextData(html); if (!j) return [];
  const ls = j?.props?.pageProps?.searchRequestAndResponse?.listings || [];
  return ls.map(l => {
    const at = {}; (l.attributes || []).forEach(a => at[a.key] = a.value);
    return {
      title: l.title || '', price_eur: Math.round((l.priceInfo?.priceCents || 0) / 100),
      km: parseInt(at.mileage || '', 10) || null, ez: String(at.constructionYear || ''),
      location: l.location?.cityName || '', country: base.includes('2dehands') ? 'BE' : 'NL',
      seller: l.sellerInformation?.sellerName || '',
      url: l.vipUrl ? base + l.vipUrl : '', src: base.includes('2dehands') ? '2dehands' : 'marktplaats',
      bieden: l.priceInfo?.priceType === 'MIN_BID',
    };
  }).filter(l => l.url && IST_911.test(l.title) && !NICHT_911.test(l.title)
    && /\/v\/auto-s\//.test(l.url) // nur Fahrzeug-Kategorie, keine Teile
    && l.price_eur >= 8000 && l.price_eur <= MAX_EUR && yearOk(l.ez));
}

// bekannte Inserate laden
const seenFile = path.join(REPO, 'data/seen-listings.json');
const notifiedFile = path.join(REPO, 'data/monitor-notified.json');
const pendingFile = path.join(REPO, 'data/pending-candidates.json');
const load = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const seen = load(seenFile, { listings: [] });
const notified = load(notifiedFile, { keys: [] });
const pending = load(pendingFile, { candidates: [] });
const known = new Set();
for (const l of seen.listings) { known.add(norm(l.url).slice(-40)); known.add(fuzzy(l)); }
for (const k of notified.keys) known.add(k);

const health = [];
let found = [];
for (const s of SOURCES) {
  if (CYCLE % s.everyN !== 0) continue;
  const html = fetch(s.url);
  if (!html) { health.push(s.key + ':FAIL'); continue; }
  let ls;
  try {
    ls = s.type === 'as24' ? parseAs24(html, s.base)
       : s.type === 'wh' ? parseWh(html)
       : s.type === 'gw' ? parseGw(html)
       : s.type === 'mp' ? parseMp(html, s.base)
       : s.type === 'ct' ? parseCt(html)
       : parseKa(html);
  } catch (e) { health.push(s.key + ':PARSE'); continue; }
  if (ls === null) { health.push(s.key + ':RATELIMIT'); continue; }
  health.push(s.key + ':' + ls.length);
  found = found.concat(ls);
}

const fresh = [];
for (const l of found) {
  if (PROJEKT.test(l.title || '')) continue;
  if (NICHT_911.test(l.title || '') && !/911|912|964|targa/i.test(l.title || '')) continue; // zentrale Modell-Sperre (996/993/944 etc.)
  if (/996|993|997|991|992/.test(l.title || '')) continue; // wassergekuehlt/zu modern: raus
  if (l.km >= 900000) continue; // km unbekannt/999999 = Projektverdacht, raus
  const k1 = norm(l.url).slice(-40), k2 = fuzzy(l);
  if (known.has(k1) || known.has(k2)) continue;
  known.add(k1); known.add(k2);
  fresh.push(l);
  notified.keys.push(k1, k2);
  pending.candidates.push({ ...l, found_at: new Date().toISOString() });
}
fs.writeFileSync(notifiedFile, JSON.stringify({ keys: notified.keys.slice(-4000) }, null, 0));
fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 1));

// stdout = Event-Stream: NUR neue Kandidaten (+ Health nur bei Problemen)
const problems = health.filter(h => /FAIL|PARSE|RATELIMIT/.test(h) && !/kleinanzeigen:RATELIMIT/.test(h));
if (problems.length >= 3) console.log('SCAN-PROBLEM: ' + problems.join(' '));
for (const l of fresh) {
  const tag = l.price_eur <= ALERT_EUR ? 'GLUECKSTREFFER' : 'NEU';
  console.log(`${tag} [${l.price_eur}€|${l.km || '?'}km|EZ ${l.ez || '?'}|${l.location || l.country}|${l.src}] ${l.title.slice(0, 60)} ${l.url}`);
}
if (process.env.VERBOSE) console.error('health: ' + health.join(' ') + ' | neu: ' + fresh.length);
