#!/usr/bin/env node
// Liest alle data/intake/*.json (vom Runner geholte Detailseiten), zieht Eckdaten und den
// Beschreibungstext, markiert Projekt-/Koeder-/Farb-Signale und zeigt Treffer aus
// data/crosscheck.json (dasselbe Auto woanders). Nur Ausgabe, keine Bewertung.
import fs from 'node:fs';
import path from 'node:path';
const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const dir = path.join(REPO, 'data', 'intake');
const only = process.argv.slice(2); // optional: Teil-URLs zum Filtern
const PROJEKT = /karosse|karosserie\b|rolling|schlacht|ersatzteil|teiletr|restaurations?basis|restaur[a-z]*objekt|projekt|ohne motor|motorschaden|unfall|scheunenfund|nicht fahrbereit|springt nicht an|steht seit/i;
const ROT = /\b(rot|indischrot|guards red|feuerrot)\b/i;
let cc = { groups: [] }; try { cc = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'crosscheck.json'), 'utf8')); } catch {}
let seen = { listings: [] }; try { seen = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'seen-listings.json'), 'utf8')); } catch {}
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (only.length && !only.some(o => r.url.includes(o))) continue;
  const t = r.text || '';
  const g = (re, d) => { const m = re.exec(t); return m ? (m[1] || m[0]).trim() : (d ?? '?'); };
  const price = g(/(\d{1,3}(?:\.\d{3})+)\s*€/);
  const ez = g(/Erstzulassung\s*\n?\s*([A-Za-zä]+ \d{4}|\d{2}\/\d{4})/) ;
  const km = g(/Kilometerstand\s*\n?\s*([\d.]+)\s*km/);
  const ps = g(/Leistung\s*\n?\s*([\d.]+)\s*PS/);
  const hu = g(/HU\s*\n?\s*([A-Za-zä]+ \d{4}|\d{2}\/\d{4}|neu)/);
  const farbe = g(/Außenfarbe\s*\n?\s*([A-Za-zäöüß ]+)/);
  const ort = g(/(\d{5}\s+[A-ZÄÖÜ][A-Za-zäöüß.\- ]+)/);
  const seller = /Gewerblicher Nutzer|Händler/i.test(t) ? 'Haendler' : (/Privater Nutzer|Privat/i.test(t) ? 'privat' : '?');
  const online = g(/(\d{2}\.\d{2}\.\d{4})/);
  const tel = g(/(\+?\d[\d \/-]{8,}\d)/, '');
  const di = t.indexOf('Beschreibung'); const de = t.indexOf('Rechtliche Angaben', di);
  const desc = di >= 0 ? t.slice(di + 12, de > di ? de : di + 3000).replace(/\n{2,}/g, '\n').trim() : '(keine Beschreibung gefunden)';
  // Abgleich nur ueber die Anzeigen-ID (kleinanzeigen: 9-10 Ziffern) oder den vollen Pfad,
  // sonst trifft ein kurzes Pfadstueck auf alles
  const rid = /\/(\d{9,})(?:-|\/|$)/.exec(r.url)?.[1];
  const rpath = (r.final_url || r.url).split('?')[0].replace(/\/$/, '');
  const known = seen.listings.find(l => l.url && ((rid && l.url.includes(rid)) || l.url.split('?')[0].replace(/\/$/, '') === rpath));
  const grp = cc.groups.find(gr => gr.listings.some(l => l.url === r.url));
  console.log('\n' + '='.repeat(100));
  console.log(`${r.title.replace(/ \| Kleinanzeigen.*$/, '')}   [http ${r.http}${r.blocked ? ' GESPERRT' : ''}, ${r.images.length} Bilder]`);
  console.log(`Preis ${price} | EZ ${ez} | ${km} km | ${ps} PS | HU ${hu} | Farbe ${farbe}${ROT.test(farbe) ? '  <<< ROT' : ''} | ${seller} | ${ort} | online seit ${online}${tel ? ' | Tel ' + tel : ''}`);
  if (PROJEKT.test(desc)) console.log('SIGNAL: ' + desc.match(PROJEKT)[0]);
  if (known) console.log('BEKANNT: ' + known.verdict + ' (' + known.first_seen + ')');
  if (grp) console.log('CROSSCHECK: ' + grp.reasons.join(', ') + ' -> ' + grp.listings.filter(l => l.url !== r.url).map(l => l.src + ' ' + (l.prices.at(-1)?.p || '?') + '€ ' + l.url).join(' ; '));
  console.log('-'.repeat(100)); console.log(desc.slice(0, 2200)); console.log(r.url);
}
if (!files.length) console.log('keine Intake-Dateien');
