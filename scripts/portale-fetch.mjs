#!/usr/bin/env node
// Portale, die nur vom GitHub-Runner erreichbar sind (Sandbox: 403). Holt Suchseiten,
// zieht Inserate generisch (Link + Text drumherum) und schreibt data/portale-live.json.
// Zusaetzlich landet pro Portal ein gekuerzter HTML-Ausschnitt in data/portale-raw/,
// damit die Parser ohne Runner-Zugriff nachgeschaerft werden koennen.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
// elferspot: /de/suchen/ ist ein GET-Formular (body[], model[], price_to, year_to). Die
// Treffer sind Teaser <a href=".../de/fahrzeug/<slug>-<id>/" class="content-teaser"> mit
// Flagge (Land), Baujahr und <h3>Titel</h3>. Preis steht nur auf der Detailseite (Intake).
// RSS-Feeds (/de/search/<q>/feed/rss2/) liefern nur Shop-Artikel, nicht die Boerse.
const ES = 'https://www.elferspot.com/de/suchen/?price_to=60000&';
const mods = a => a.map(m => 'model%5B%5D=' + m).join('&');
const PORTALE = [
  { name: 'elferspot-targa', url: ES + 'body%5B%5D=targa', teaser: true },
  { name: 'elferspot-g', url: ES + mods(['911-g-modell', '911-s-g-modell', '911-sc', '911-sc-us', '911-carrera-3-0', '911-carrera-3-2', '911-carrera-3-2-us', '911-carrera-3-2-kat', '911-carrera-2-7', '911-carrera-us']), teaser: true },
  { name: 'elferspot-f', url: ES + mods(['911', '911-e', '911-l', '911-s', '911-t', '911-t-us', '912', '912-e']), teaser: true },
  { name: 'elferspot-964', url: ES + mods(['964-carrera-2', '964-carrera-4']), teaser: true },
  // Stand 16.09.: pff hat keinen oeffentlichen Marktplatz in der Board-Liste (nur Modell-Foren),
  // troostwijk liefert die Lose per JS (0 Links in 475 kB). Beide nicht weiter abgerufen.
];
const IST = /(?<!\d)(?:911|912|964)(?!\d)|targa|g.?modell|\bsc\b|carrera/i;
const NICHT = /cayenn?e|macan|panamera|boxster|cayman|taycan|914|924|944|928|968|993|996|997|991|992|turbo ?s\b|gt[23]\b/i;
const out = { fetched_at: new Date().toISOString(), runner: process.env.GITHUB_RUN_ID || 'lokal', portale: [], listings: [] };
fs.mkdirSync(path.join(REPO, 'data', 'portale-raw'), { recursive: true });
for (const p of PORTALE) {
  let code = 0, body = '';
  try {
    const raw = execFileSync('curl', ['-sS', '-L', '--max-time', '30', '--compressed', '-A', UA,
      '-H', 'Accept-Language: de-DE,de;q=0.9', '-o', '-', '-w', '\n@@HTTP@@%{http_code}', p.url],
      { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
    const i = raw.lastIndexOf('\n@@HTTP@@'); code = parseInt(raw.slice(i + 9), 10); body = raw.slice(0, i);
  } catch { code = 0; }
  const seen = new Set(); let n = 0;
  if (p.teaser) {
    const re = /href="(https:\/\/www\.elferspot\.com\/de\/fahrzeug\/[^"]+)" class="content-teaser[^>]*>([\s\S]*?)<\/a>/g;
    for (const m of body.matchAll(re)) {
      const url = m[1]; if (seen.has(url)) continue; seen.add(url);
      const land = /alt="([A-Z]{2})" class="flag/.exec(m[2])?.[1] || '';
      const yr = /\/>\s*(\d{4})\s*<\/div>/.exec(m[2])?.[1] || (/-(\d{4})-\d+\/?$/.exec(url)?.[1] || '');
      const title = (/<h3>([^<]+)<\/h3>/.exec(m[2])?.[1] || '').trim();
      const img = /data-src="([^"?]+)/.exec(m[2])?.[1] || '';
      if (!IST.test(title + ' ' + url) || NICHT.test(title)) continue;
      if (yr && (+yr < 1960 || +yr > 1994)) continue;
      out.listings.push({ src: 'elferspot', url, title: title + (yr ? ' (' + yr + ')' : ''), price_eur: null, ez: yr, km: null, country: land, image: img, snippet: '' });
      n++;
    }
    out.portale.push({ name: p.name, code, size: body.length, links: seen.size, treffer: n });
    fs.writeFileSync(path.join(REPO, 'data', 'portale-raw', p.name + '.html'), body.slice(0, 400000));
    console.log(`${p.name.padEnd(16)} http=${code} size=${body.length} teaser=${seen.size} treffer=${n}`);
    await new Promise(r => setTimeout(r, 2000));
    continue;
  }
  for (const m of body.matchAll(p.link || /$^/g)) {
    const url = (p.base ? p.base + m[0] : m[0]).replace(/\/?$/, '/');
    if (seen.has(url) || /\/(kategorie|category|tag|page|seite|blog|magazin|wp-|feed|author|kontakt|impressum|datenschutz|agb|login|register)\b/i.test(url)) continue;
    seen.add(url);
    // Kontext: 1500 Zeichen ab dem Link, Tags raus, daraus Titel/Preis/Jahr/km grob ziehen
    const ctx = body.slice(m.index, m.index + 2500).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const slug = url.split('/').filter(Boolean).pop().replace(/-/g, ' ');
    const title = (/^(.{10,120}?)(?:\s{2,}|\s\d{1,3}\.\d{3})/.exec(ctx)?.[1] || slug).trim();
    const price = /(\d{1,3}(?:[.\s]\d{3})+)\s*(?:€|EUR)/.exec(ctx);
    const yr = /\b(19[6-9]\d)\b/.exec(slug + ' ' + ctx);
    const km = /(\d{1,3}(?:[.\s]\d{3})*)\s*km\b/i.exec(ctx);
    if (!IST.test(slug + ' ' + title + ' ' + ctx.slice(0, 200)) || NICHT.test(slug + ' ' + title)) continue;
    out.listings.push({ src: p.name.replace(/-.*/, ''), url, title, price_eur: price ? parseInt(price[1].replace(/\D/g, ''), 10) : null,
      ez: yr ? yr[1] : '', km: km ? parseInt(km[1].replace(/\D/g, ''), 10) : null, snippet: ctx.slice(0, 300) });
    n++;
  }
  out.portale.push({ name: p.name, code, size: body.length, links: seen.size, treffer: n });
  fs.writeFileSync(path.join(REPO, 'data', 'portale-raw', p.name + '.html'), body.slice(0, 400000));
  console.log(`${p.name.padEnd(14)} http=${code} size=${body.length} links=${seen.size} treffer=${n}`);
  await new Promise(r => setTimeout(r, 2000));
}
fs.writeFileSync(path.join(REPO, 'data', 'portale-live.json'), JSON.stringify(out, null, 1));
