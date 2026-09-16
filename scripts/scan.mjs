#!/usr/bin/env node
// 996-Schnellscan: holt Portale per curl, extrahiert Kandidaten <=33k,
// dedupet gegen seen-listings + bereits gemeldete, druckt NUR neue Kandidaten
// (eine JSON-Zeile pro Fund) und sammelt sie in data/pending-candidates.json.
// Verifikation und Mail macht Claude nach dem Wake-up, nie dieses Skript.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
// Laufzaehler: Hintergrundprozesse ueberleben in dieser Umgebung den Turn-Wechsel nicht
// (am 15.09. zweimal gestorben, einmal binnen einer Stunde). Der Zaehler steht deshalb
// auf der Platte statt in einer Schleifenvariable, damit die Quellen- und Tippfehler-
// Rotation auch dann weiterlaeuft, wenn jeder Lauf ein eigener Prozess ist.
const stateFile = path.join(REPO, 'data', 'scan-state.json');
let runNo;
if (process.env.CYCLE) {
  runNo = parseInt(process.env.CYCLE, 10);
} else {
  let st = {}; try { st = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
  runNo = (st.run || 0) + 1;
  try { fs.writeFileSync(stateFile, JSON.stringify({ run: runNo, last: new Date().toISOString() }, null, 1)); } catch {}
}
const CYCLE = runNo;
const MAX_EUR = 45000; // Beobachtungsgrenze Winterfenster
const ALERT_EUR = 32000; // Glueckstreffer-Zone fuer Sofort-Alert

// Tippfehler-Rotation fuer kleinanzeigen (exakte Suche, 1 Abruf pro Stunde):
// jeder Stunden-Slot nimmt die naechste Query, Tippfehler-Inserate haben weniger Konkurrenz
const KA_QUERIES = [
  // korrekt geschrieben, die volumenstarken Suchen
  'preis::45000/porsche-targa', 'preis::45000/porsche-911-sc', 'preis::45000/porsche-g-modell',
  'preis::45000/porsche-oldtimer', 'preis::45000/porsche-964', 'preis::45000/porsche-912',
  'preis::45000/porsche-911-targa', 'preis::45000/porsche-elfer', 'preis::45000/porsche-911er',
  'preis::45000/porsche-carrera-3-2', 'preis::45000/porsche-911-luftgekuehlt',
  // Vertipper: diese Inserate haben kaum Konkurrenz, weil sie in keiner Standardsuche auftauchen
  'preis::45000/porshe', 'preis::45000/porche', 'preis::45000/posche', 'preis::45000/porsh',
  'preis::45000/porsche-911-taga', 'preis::45000/porsche-tagra', 'preis::45000/carera',
  'preis::45000/carrerra', 'preis::45000/porsche-911-carera', 'preis::45000/porsce',
];

const kaSlot = CYCLE % KA_QUERIES.length; // jeder Lauf nimmt die naechste Variante

const SOURCES = [
  { key: 'as24-de', everyN: 1, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=D&sort=age&desc=1' },
  { key: 'as24-at', everyN: 1, type: 'as24', base: 'https://www.autoscout24.at',
    url: 'https://www.autoscout24.at/lst/porsche/911?atype=C&priceto=45000&fregto=1994&sort=age&desc=1' },
  { key: 'as24-912', everyN: 2, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/912?atype=C&priceto=45000&cy=D%2CA%2CNL%2CB%2CF%2CI&sort=age&desc=1' },
  { key: 'as24-nb', everyN: 1, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=NL%2CB%2CF%2CI%2CL&sort=age&desc=1' },
  { key: 'as24-at2', everyN: 2, type: 'as24', base: 'https://www.autoscout24.at',
    url: 'https://www.autoscout24.at/lst/porsche/911?atype=C&priceto=45000&fregto=1994&page=2' },
  { key: 'as24-nb2', everyN: 2, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=NL%2CB%2CF%2CI%2CL&page=2' },
  // Marke ohne Modell: faengt falsch einsortierte Wagen ("Porsche Sonstige", Modell leer gelassen).
  // strict=true, weil hier auch 944/928/Traktoren drin sind -> Titel MUSS 911/912/964/Targa zeigen.
  { key: 'as24-alle-de', everyN: 1, type: 'as24', strict: true, base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche?atype=C&priceto=45000&fregto=1994&cy=D&sort=age&desc=1' },
  { key: 'as24-alle-at', everyN: 2, type: 'as24', strict: true, base: 'https://www.autoscout24.at',
    url: 'https://www.autoscout24.at/lst/porsche?atype=C&priceto=45000&fregto=1994&sort=age&desc=1' },
  { key: 'as24-alle-nb', everyN: 2, type: 'as24', strict: true, base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche?atype=C&priceto=45000&fregto=1994&cy=NL%2CB%2CF%2CI%2CL&sort=age&desc=1' },
  // mehr Seiten der Kernsuche
  { key: 'as24-de2', everyN: 2, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=D&page=2' },
  { key: 'as24-de3', everyN: 3, type: 'as24', base: 'https://www.autoscout24.de',
    url: 'https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=45000&fregto=1994&cy=D&page=3' },
  // weitere Laender (neu getestet 15.09., liefern eigenes nationales Inventar)
  { key: 'ct-964', everyN: 3, type: 'ct', base: 'https://www.classic-trader.com',
    url: 'https://www.classic-trader.com/de/automobile/suche/porsche/911/964?sort=price_asc' },
  { key: 'willhaben', everyN: 1, type: 'wh', base: 'https://www.willhaben.at/iad/',
    url: 'https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse?keyword=Porsche%20911&PRICE_TO=45000&YEAR_MODEL_TO=1994' },
  { key: '12gw', everyN: 1, type: 'gw', base: 'https://www.12gebrauchtwagen.de',
    url: 'https://www.12gebrauchtwagen.de/auto/porsche/911er' },
  { key: '12gw-2', everyN: 2, type: 'gw', base: 'https://www.12gebrauchtwagen.de',
    url: 'https://www.12gebrauchtwagen.de/auto/porsche/911er?page=2' },
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
  { key: 'marktplaats-2', everyN: 3, type: 'mp', base: 'https://www.marktplaats.nl',
    url: 'https://www.marktplaats.nl/q/porsche+911+oldtimer/' },
  { key: '2dehands-2', everyN: 3, type: 'mp', base: 'https://www.2dehands.be',
    url: 'https://www.2dehands.be/q/porsche+911+oldtimer/' },
  // Catawiki-Auktionen: laufen ueber marktplaats/2dehands als Spiegel. Eigener Kanal,
  // den Patrick auf kleinanzeigen nie sieht, und dort landen Autos regelmaessig unter Schaetzwert.
  { key: 'mp-auktion', everyN: 2, type: 'mp', base: 'https://www.marktplaats.nl',
    url: 'https://www.marktplaats.nl/q/porsche+targa+oldtimer/' },
  { key: 'mp-auktion-2', everyN: 3, type: 'mp', base: 'https://www.marktplaats.nl',
    url: 'https://www.marktplaats.nl/q/porsche+911+targa/' },
  { key: '2dh-auktion', everyN: 3, type: 'mp', base: 'https://www.2dehands.be',
    url: 'https://www.2dehands.be/q/porsche+911+targa/' },
  // Route 66 Auctions (Waalwijk, NL): woechentliche Online-Auktionen, dauerhaft 200+ Fahrzeuge,
  // eigene Kategorie "Air-cooled". Gebote starten bei 1.000 EUR, es gibt aber immer einen
  // Mindestpreis. Die Lose sind WooCommerce-Produkte und ueber die offene wp-json-Schnittstelle
  // abfragbar. Preise stehen dort nicht drin, die holt die Tiefenpruefung von der Detailseite.
  { key: 'route66', everyN: 1, type: 'r66', base: 'https://www.route66auctions.com',
    url: 'https://www.route66auctions.com/wp-json/wp/v2/product?product_cat=26&per_page=100&page=1&_fields=link,title,product_cat' },
  // Zweite Seite ist Pflicht: die Kategorie hat rund 125 Eintraege. Mit nur einem
  // Abruf sah ich am 16.09. ein wanderndes 60er-Fenster, dadurch verschwanden
  // Fahrzeuge unbemerkt aus der Liste, statt als verkauft erkannt zu werden.
  { key: 'route66-2', everyN: 1, type: 'r66', base: 'https://www.route66auctions.com',
    url: 'https://www.route66auctions.com/wp-json/wp/v2/product?product_cat=26&per_page=100&page=2&_fields=link,title,product_cat' },
  // kleinanzeigen: GENAU EIN Abruf pro Lauf (= stuendlich). Bei 403 nicht nachdruecken.
  { key: 'kleinanzeigen', everyN: 1, type: 'ka', base: 'https://www.kleinanzeigen.de',
    url: 'https://www.kleinanzeigen.de/s-autos/' + KA_QUERIES[kaSlot] + '/k0c216' },
];
const NICHT_911 = /^vw\b|^volkswagen|\bt1\b|kaefer|käfer|cayenn?e|macann?|panamera?|boxster|cayman|taycan|914|924|944|928|968|996|997|991|992|993|carrera gt|junior|traktor|diesel/i;
// Karosserien, Projekte, Teile: fliegen komplett raus (Patrick will NUR fahrbereite Autos)
const PROJEKT = /frame|carrosserie|body.?(chassis|shell)|karosserie\b|rolling|schlacht|ersatzteil|onderdel|teiletr|restauratie|restaurations?basis|restaur[a-z]*objekt|restaurationsabbruch|restoration|te restaureren|gerestaureerd worden|projec?t\b|projekt|basis\b|r(ue|ü)cksitz|sitze aus|teile aus|aus porsche|ohne motor|zonder motor|no engine|motorschaden|unfall|accident|gereviseerd worden|opknapper|barn find|scheunenfund/i;
const MODERN = /gt[23]\b|turbo ?s\b|carrera ?[24]s\b|\bgts\b|\bpdk\b|keramik|sport ?chrono|schalensitze|\blift\b|speedster|\bdakar\b|\brs\b/i;
// Modellnummern duerfen nicht in Jahreszahlen treffen: "1964" enthaelt "964",
// dadurch galt am 15.09. ein Autobianchi von 1964 als Elfer. Gleiches gilt fuer 1911/1912.
const IST_911 = /(?<!\d)(?:911|912|964)(?!\d)|targa|oldtimer|g.?modell|\bsc\b|porshe|porche|posche|porsch\b|carera|carrerra/i;

import { execFile } from 'node:child_process';
// Parallel-Abruf: bei 20+ Quellen ist serielles curl zu langsam fuer den 5-Minuten-Takt
// Status mit ausgeben: eine 404/410-Fehlerseite hat einen Body und wurde frueher
// als gueltiges Ergebnis geparst (am 15.09. lieferte ein toter classic-trader-Pfad
// per 410 eine Liste voller 924 und Cayenne).
function fetchAsync(url) {
  return new Promise(res => {
    execFile('curl', ['-sS', '-L', '--max-time', '25', '--compressed', '-o', '-', '-w', '\n@@HTTP@@%{http_code}', url],
      { maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' }, (err, out) => {
        if (err || !out) return res(null);
        const i = out.lastIndexOf('\n@@HTTP@@');
        if (i < 0) return res(out);
        const code = parseInt(out.slice(i + 9), 10);
        const body = out.slice(0, i);
        // kleinanzeigen 403 braucht den Body, damit die Sperre als RATELIMIT erkannt wird
        if (code >= 400 && !/kleinanzeigen/.test(url)) return res(null);
        res(body);
      });
  });
}
function resolveUrl(url) {
  return new Promise(res => {
    execFile('curl', ['-sS', '-L', '-o', '/dev/null', '--max-time', '20', '-w', '%{url_effective}', url],
      { encoding: 'utf8' }, (err, out) => res(err ? null : (out || '').trim()));
  });
}
async function fetchAll(list, concurrency = 6, urlOnly = false) {
  const results = new Map(); let i = 0;
  const worker = async () => { while (i < list.length) { const s = list[i++]; results.set(s.key, urlOnly ? await resolveUrl(s.url) : await fetchAsync(s.url)); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return results;
}
function fetch(url) {
  try {
    return execFileSync('curl', ['-sS', '-L', '--max-time', '25', '--compressed',
      '-o', '-', '-w', '', url], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
  } catch (e) { return null; }
}
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fuzzy = l => norm(l.title).slice(0, 25) + '|' + Math.round(l.price_eur / 100) + '|' + Math.round((l.km || 0) / 2000);
// erkennt 123456, 1234567, 654321, 111111, 222222 ... als Fantasieangabe
function platzhalterKm(km) {
  const d = String(km);
  if (d.length < 5) return false;
  if (/^(\d)\1+$/.test(d)) return true;                       // 111111
  const up = '123456789'.repeat(2), down = '987654321'.repeat(2);
  return up.includes(d) || down.includes(d);                    // 123456 / 654321
}
const yearOk = ez => { const m = /((?:19|20)\d{2})/.exec(ez || ''); return !m || (+m[1] >= 1960 && +m[1] <= 1994); };

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
  // 12gw-Titel sind unbrauchbar (oft nur "Porsche"). Wer ein EZ mitliefert, wird hier
  // schon gefiltert; alle anderen bekommen _resolve und werden ueber den Ziel-Link geprueft.
  return out.filter(l => yearOk(l.ez) && !NICHT_911.test(l.title) && !MODERN.test(l.title))
    .map(l => (l.ez ? l : { ...l, _resolve: true }));
}
function parseR66(json) {
  let arr; try { arr = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const it of arr) {
    // Kategorie 20 = "Sold". Die Suche liefert auch beendete Auktionen mit,
    // am 15.09. war ein 911 S Targa 1976 darunter, der laengst verkauft war.
    if ((it.product_cat || []).includes(20)) continue;
    const title = (it.title?.rendered || '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim();
    const yr = /\|\s*(\d{4})\s*$/.exec(title);
    if (!yr || +yr[1] < 1960 || +yr[1] > 1994) continue;      // nur luftgekuehlte Baujahre
    if (!IST_911.test(title) || NICHT_911.test(title) || MODERN.test(title)) continue;
    out.push({
      title, price_eur: 0, km: null, ez: yr[1], location: 'Waalwijk', country: 'NL',
      seller: 'Route 66 Auctions', url: it.link || '', src: 'route66', auktion: true,
    });
  }
  return out.filter(l => l.url);
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
      url: l.vipUrl ? base + l.vipUrl : '', src: /catawiki/i.test(l.sellerInformation?.sellerName || '')
        ? 'catawiki-auktion' : (base.includes('2dehands') ? '2dehands' : 'marktplaats'),
      bieden: l.priceInfo?.priceType === 'MIN_BID',
      auktion: /catawiki/i.test(l.sellerInformation?.sellerName || ''),
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
const due = SOURCES.filter(s => CYCLE % s.everyN === 0);
const htmls = await fetchAll(due);
for (const s of due) {
  const html = htmls.get(s.key);
  if (!html) { health.push(s.key + ':FAIL'); continue; }
  let ls;
  try {
    ls = s.type === 'as24' ? parseAs24(html, s.base)
       : s.type === 'wh' ? parseWh(html)
       : s.type === 'gw' ? parseGw(html)
       : s.type === 'mp' ? parseMp(html, s.base)
       : s.type === 'ct' ? parseCt(html)
       : s.type === 'r66' ? parseR66(html)
       : parseKa(html);
  } catch (e) { health.push(s.key + ':PARSE'); continue; }
  if (ls === null) { health.push(s.key + ':RATELIMIT'); continue; }
  health.push(s.key + ':' + ls.length);
  if (s.strict) for (const l of ls) l._strict = true;
  found = found.concat(ls);
}

// 12gebrauchtwagen verlinkt nur per offer_id. Erst die Ziel-URL verraet das Modell
// (Slug enthaelt z.B. "porsche-911-turbo-s-cabriolet"), darum hier aufloesen und danach filtern.
const toResolve = found.filter(l => l._resolve);
if (toResolve.length) {
  const finals = await fetchAll(toResolve.map(l => ({ key: l.url, url: l.url })), 4, true);
  for (const l of toResolve) {
    const fin = finals.get(l.url);
    if (!fin) { l._drop = true; continue; }
    l.url = fin;
    const slug = decodeURIComponent(fin).replace(/[-_/]/g, ' ');
    if (!IST_911.test(slug) || NICHT_911.test(slug) || MODERN.test(slug)) { l._drop = true; continue; }
    const nm = /angebote\/([a-z0-9-]+?)(?:-benzin|-diesel|-cat_)/.exec(fin);
    if (nm) l.title = nm[1].replace(/-/g, ' ');
  }
}
found = found.filter(l => !l._drop);

const fresh = [];
for (const l of found) {
  if (l._strict && !IST_911.test(l.title || '')) continue; // Marke-ohne-Modell-Quelle: nur echte Elfer/912/964
  if (PROJEKT.test(l.title || '')) continue;
  if (MODERN.test(l.title || '')) continue; // moderne 911-Derivate (GT3, Turbo S, ...)
  // Modell-Sperre ist absolut: "944 S2 Targa" und "914 Targa" sind KEINE Elfer.
  // Frueher hebelte das Wort "Targa" die Sperre aus, dadurch kamen 924/944/914 durch.
  if (NICHT_911.test(l.title || '')) continue;
  if (/996|993|997|991|992/.test(l.title || '')) continue; // wassergekuehlt/zu modern: raus
  // Baujahr aus dem Titel ziehen (marktplaats & Co. liefern oft kein EZ-Feld):
  // alles ab 1995 ist wassergekuehlt oder 993 und damit ausserhalb des Suchprofils
  const ty = /\b(19[5-9]\d|20[0-2]\d)\b/.exec(l.title || '');
  if (ty && +ty[1] > 1994) continue;
  if (l.src === 'route66') { /* Preis steht erst auf der Detailseite, Filter greift dort */ }
  else if (l.km >= 900000) continue; // km unbekannt/999999 = Projektverdacht, raus
  // Platzhalter-Kilometerstaende: 123456, 111111, 654321 usw. Wer den Tacho nicht angibt,
  // hat meist kein fahrbereites Auto. Gefunden am 15.09. an einem zerlegten 1972er
  // Oelklappen-Modell fuer 33k, dessen erstes Foto ein fremdes Auto zeigte.
  if (l.km && platzhalterKm(l.km)) { l._platzhalter = true; }
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
  // Koederpreis-Heuristik: ein fahrbereiter luftgekuehlter Elfer unter 18k existiert nicht.
  // Beispiel 15.09.: "911 Carrera 1994" fuer 8.499 EUR war in Wahrheit ein 993 (Markt 70-100k).
  const koeder = !l.auktion && l.price_eur < 18000;
  const tag = l._platzhalter ? 'PLATZHALTER-KM'
    : koeder ? 'KOEDER-VERDACHT'
    : l.auktion ? 'AUKTION'
    : (l.price_eur <= ALERT_EUR ? 'GLUECKSTREFFER' : 'NEU');
  console.log(`${tag} [${l.price_eur}€|${l.km || '?'}km|EZ ${l.ez || '?'}|${l.location || l.country}|${l.src}] ${l.title.slice(0, 60)} ${l.url}`);
}
if (process.env.VERBOSE) console.error('health: ' + health.join(' ') + ' | neu: ' + fresh.length);
