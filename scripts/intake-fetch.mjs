#!/usr/bin/env node
// Analyse-Eingang: holt EIN Inserat (URL aus INTAKE_URL) vom GitHub-Runner und legt
// den bereinigten Text plus Rohdaten unter data/intake/<id>.json ab. Patrick schickt
// einen Link, der stuendliche Lauf oder ein manueller Dispatch holt ihn, Claude liest ihn.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
let urls = (process.env.INTAKE_URL || '').split(/[\s,]+/).map(u => u.trim()).filter(u => /^https?:\/\//.test(u));
// Ohne expliziten Link: alle neuen Kandidaten des Scanners (alle Quellen) automatisch holen,
// damit fingerprint.py Bilder von AutoScout24, Kickdown, Route 66 und Kleinanzeigen hashen kann.
if (!urls.length && process.env.INTAKE_FROM_PENDING === '1') {
  try {
    const pend = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'pending-candidates.json'), 'utf8'));
    const done = new Set(fs.existsSync(path.join(REPO, 'data', 'intake')) ? fs.readdirSync(path.join(REPO, 'data', 'intake')).map(f => f.replace('.json', '')) : []);
    urls = (pend.candidates || []).map(c => c.url).filter(u => u && !done.has(crypto.createHash('sha1').update(u).digest('hex').slice(0, 10))).slice(-25);
    console.log('pending-candidates: ' + urls.length + ' neue Detailseiten');
  } catch (e) { urls = []; }
}
if (!urls.length) { console.log('nichts zu holen'); process.exit(0); }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
for (const url of urls) {
let code = 0, body = '', final = url;
  try {
    const raw = execFileSync('curl', ['-sS', '-L', '--max-time', '30', '--compressed', '-A', UA,
      '-H', 'Accept-Language: de-DE,de;q=0.9', '-o', '-', '-w', '\n@@HTTP@@%{http_code}@@%{url_effective}', url],
      { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
    const i = raw.lastIndexOf('\n@@HTTP@@'); const tail = raw.slice(i + 9).split('@@');
    code = parseInt(tail[0], 10); final = tail[1] || url; body = raw.slice(0, i);
  } catch (e) { code = 0; }
  const text = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<(br|p|li|h\d|tr|div)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  // Bilder: Attribute UND JSON-Bloecke (kleinanzeigen, marktplaats liefern die Galerie als
  // JSON mit escapten Slashes; die CDN-URLs von kleinanzeigen tragen die Endung nur im Query)
  const unesc = body.replace(/\\\//g, '/');
  const imgs = [...unesc.matchAll(/https?:\/\/[^"'\s<>\\]+/g)].map(m => m[0])
    .filter(u => /img\.kleinanzeigen\.de\/api\/v1\/prod-ads\/images|images\.marktplaats\.com|\.(jpe?g|webp|png)(\?|$)/i.test(u))
    .filter(u => !/logo|icon|sprite|avatar|placeholder|flag|badge|\/static\/|banner|1x1|pixel/i.test(u))
    .map(u => u.replace(/\?rule=\$_\d+\.JPG$/, '?rule=$_59.JPG'));
  const id = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const rec = { id, url, final_url: final, fetched_at: new Date().toISOString(), http: code,
    blocked: /IP-Bereich|access denied|captcha/i.test(body), title: (/<title[^>]*>([^<]*)<\/title>/i.exec(body) || [])[1] || '',
    text: text.slice(0, 40000), images: [...new Set(imgs)].slice(0, 60) };
  fs.mkdirSync(path.join(REPO, 'data', 'intake'), { recursive: true });
  fs.writeFileSync(path.join(REPO, 'data', 'intake', id + '.json'), JSON.stringify(rec, null, 1));
  console.log(`intake ${id}: http=${code} text=${text.length} bilder=${rec.images.length}${rec.blocked ? ' GESPERRT' : ''}`);
  
  await new Promise(r => setTimeout(r, 2000));
}
