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
const PORTALE = [
  // elferspot: die Suchseite (?s=) rendert die Treffer per JS, liefert aber einen RSS-Feed
  // pro Suchbegriff (Lauf 16.09.: nur Menue-Links im HTML). Feed + /de/suchen/ (Boerse).
  { name: 'elferspot', url: 'https://www.elferspot.com/de/search/targa/feed/rss2/', link: /https:\/\/www\.elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\/?(?=[<"'\s])/g },
  { name: 'elferspot-911', url: 'https://www.elferspot.com/de/search/911/feed/rss2/', link: /https:\/\/www\.elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\/?(?=[<"'\s])/g },
  { name: 'elferspot-912', url: 'https://www.elferspot.com/de/search/912/feed/rss2/', link: /https:\/\/www\.elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\/?(?=[<"'\s])/g },
  { name: 'elferspot-suchen', url: 'https://www.elferspot.com/de/suchen/', link: /https:\/\/www\.elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\/?(?=[<"'\s])/g },
  // pff: Forum, Marktplatz-Board erst ueber die Board-Liste finden
  { name: 'pff', url: 'https://www.pff.de/board-list/', link: /https?:\/\/www\.pff\.de\/(board|thread)\/[^"'<\s]*/g },
  // troostwijk: Lose sind relative Links /de/l/<slug>-A1-<nr>, Suche ueber /de/search
  { name: 'troostwijk', url: 'https://www.troostwijkauctions.com/de/search?q=porsche%20911', link: /\/de\/l\/[a-z0-9-]+-A1-\d+-\d+/g, base: 'https://www.troostwijkauctions.com' },
  { name: 'troostwijk-2', url: 'https://www.troostwijkauctions.com/de/c/oldtimer-und-klassiker', link: /\/de\/l\/[a-z0-9-]+-A1-\d+-\d+/g, base: 'https://www.troostwijkauctions.com' },
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
  for (const m of body.matchAll(p.link)) {
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
