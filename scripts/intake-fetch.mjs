#!/usr/bin/env node
// Analyse-Eingang: holt EIN Inserat (URL aus INTAKE_URL) vom GitHub-Runner und legt
// den bereinigten Text plus Rohdaten unter data/intake/<id>.json ab. Patrick schickt
// einen Link, der stuendliche Lauf oder ein manueller Dispatch holt ihn, Claude liest ihn.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const url = (process.env.INTAKE_URL || '').trim();
if (!url) { console.log('INTAKE_URL leer, nichts zu tun'); process.exit(0); }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
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
const imgs = [...body.matchAll(/(?:src|data-imgsrc|data-src)="(https?:\/\/[^"]+\.(?:jpe?g|webp|png)[^"]*)"/gi)].map(m => m[1]);
const id = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
const rec = { id, url, final_url: final, fetched_at: new Date().toISOString(), http: code,
  blocked: /IP-Bereich|access denied|captcha/i.test(body), title: (/<title[^>]*>([^<]*)<\/title>/i.exec(body) || [])[1] || '',
  text: text.slice(0, 40000), images: [...new Set(imgs)].slice(0, 60) };
fs.mkdirSync(path.join(REPO, 'data', 'intake'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'data', 'intake', id + '.json'), JSON.stringify(rec, null, 1));
console.log(`intake ${id}: http=${code} text=${text.length} bilder=${rec.images.length}${rec.blocked ? ' GESPERRT' : ''}`);
