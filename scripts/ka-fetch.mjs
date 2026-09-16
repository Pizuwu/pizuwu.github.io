#!/usr/bin/env node
// Kleinanzeigen-Abruf fuer GitHub Actions. Die Claude-Sandbox teilt sich eine
// Ausgangs-IP, die kleinanzeigen.de seit 15.09. sperrt. GitHub-Runner haben
// eigene IPs. Dieses Skript holt alle Suchvarianten, schreibt das Ergebnis nach
// data/ka-live.json, und der stuendliche Scan liest die Datei statt selbst zu holen.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const MAX_EUR = 48000;
const QUERIES = [
  'porsche-targa', 'porsche-911-targa', 'porsche-911-sc', 'porsche-g-modell', 'porsche-oldtimer',
  'porsche-964', 'porsche-912', 'porsche-elfer', 'porsche-911er', 'porsche-carrera-3-2',
  'porsche-911-luftgekuehlt', 'porsche-911',
  'porshe', 'porche', 'posche', 'porsh', 'porsche-911-taga', 'porsche-tagra', 'carera',
  'carrerra', 'porsche-911-carera', 'porsce',
];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetch(url) {
  try {
    const out = execFileSync('curl', ['-sS', '-L', '--max-time', '25', '--compressed', '-A', UA,
      '-H', 'Accept-Language: de-DE,de;q=0.9', '-o', '-', '-w', '\n@@HTTP@@%{http_code}', url],
      { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
    const i = out.lastIndexOf('\n@@HTTP@@');
    return { code: parseInt(out.slice(i + 9), 10), body: out.slice(0, i) };
  } catch (e) { return { code: 0, body: '' }; }
}

function parse(html, query) {
  const out = [];
  for (const a of html.split(/<article/).slice(1)) {
    const href = /data-href="([^"]+)"/.exec(a); if (!href) continue;
    const b = a.replace(/<[^>]+>/g, ' ');
    const id = /data-adid="(\d+)"/.exec(a);
    const title = /class="ellipsis"[^>]*>\s*([^<]+)/.exec(a);
    const price = /([\d.]{4,9})\s*€/.exec(a);
    const km = /([\d.]{3,8})\s*km/.exec(a);
    const ez = /EZ\s*(\d{2}\/\d{4})/.exec(a);
    const plain = a.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').split('\n').map(x => x.trim()).filter(Boolean);
    const loc = [null, plain.find(x => /^\d{5}\s+\S/.test(x)) || ''];
    const when = [null, plain.find(x => /^(Heute|Gestern),?\s*\d{2}:\d{2}$|^\d{2}\.\d{2}\.\d{4}$/.test(x)) || ''];
    const desc = /aditem-main--middle--description[^>]*>\s*([^<]+)/.exec(a);
    const p = price ? parseInt(price[1].replace(/\./g, ''), 10) : null;
    const vb = /\bVB\b/.test(b) || /Verhandlungsbasis/i.test(b);
    // "VB" ohne Zahl ist KEIN Grund zum Verwerfen: das sind die Verhandlungsziele.
    if (p && (p < 8000 || p > MAX_EUR)) continue;
    if (!p && !vb) continue;
    out.push({
      id: id ? id[1] : null, query,
      title: (title ? title[1] : href[1].replace(/^\/s-anzeige\//, '').split('/')[0].replace(/-/g, ' ')).trim(),
      price_eur: p, vb, km: km ? parseInt(km[1].replace(/\./g, ''), 10) : null, ez: ez ? ez[1] : '',
      location: loc ? loc[1].trim() : '', posted: when ? when[1].trim() : '',
      snippet: desc ? desc[1].trim().slice(0, 300) : '',
      url: 'https://www.kleinanzeigen.de' + href[1],
    });
  }
  return out;
}

const result = { fetched_at: new Date().toISOString(), runner: process.env.GITHUB_RUN_ID || 'lokal', queries: [], listings: [] };
const seen = new Set();
// Kernsuchen zusaetzlich mit Seite 2 und 3 (kleinanzeigen zeigt ~25 Treffer pro Seite)
const PAGED = ['porsche-targa', 'porsche-911-targa', 'porsche-911', 'porsche-oldtimer', 'porsche-carrera-3-2', 'porsche-g-modell'];
const JOBS = [];
for (const q of QUERIES) { JOBS.push([q, 1]); if (PAGED.includes(q)) { JOBS.push([q, 2]); JOBS.push([q, 3]); } }
// Der Preisfilter preis::58000 blendet Inserate OHNE Preis ("VB") komplett aus. Genau die sind
// die Verhandlungsziele (16.09.: Bad Homburg 2,4 E Targa, Friedrichshafen T 2.2 Targa, Bocholt,
// Stephansposching 2.7, Dannenberg Weissach, alle nur "VB"). Darum die Kernsuchen zusaetzlich
// ohne Preisfilter, Seite 1 und 2; Inserate mit Preis ueber MAX_EUR fliegen im Parser raus.
const UNPRICED = ['porsche-targa', 'porsche-911-targa', 'porsche-911', 'porsche-g-modell', 'porsche-912', 'porsche-964'];
for (const q of UNPRICED) { JOBS.push([q, 1, true]); JOBS.push([q, 2, true]); }
for (const [q, page, ohnePreis] of JOBS) {
  const pre = ohnePreis ? '' : `preis::${MAX_EUR}/`;
  const url = page === 1 ? `https://www.kleinanzeigen.de/s-autos/${pre}${q}/k0c216`
                         : `https://www.kleinanzeigen.de/s-autos/${pre}seite:${page}/${q}/k0c216`;
  const { code, body } = fetch(url);
  const blocked = /IP-Bereich/i.test(body);
  const ls = (code === 200 && !blocked) ? parse(body, q) : [];
  result.queries.push({ q: (ohnePreis ? 'vb:' : '') + (page === 1 ? q : q + '#' + page), code, blocked, count: ls.length });
  for (const l of ls) { if (seen.has(l.url)) continue; seen.add(l.url); result.listings.push(l); }
  await sleep(2500);
}
fs.mkdirSync(path.join(REPO, 'data'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'data', 'ka-live.json'), JSON.stringify(result, null, 1));
const ok = result.queries.filter(x => x.code === 200 && !x.blocked).length;
console.log(`kleinanzeigen: ${ok}/${JOBS.length} Suchen ok, ${result.listings.length} Inserate, gesperrt: ${result.queries.filter(x => x.blocked).length}`);
