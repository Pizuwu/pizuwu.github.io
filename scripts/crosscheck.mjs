#!/usr/bin/env node
// Vergleicht alle Inserate in data/fingerprints.json paarweise: gleiche Bilder (Hamming <= 6
// auf dHash oder pHash), gleiche FIN, oder gleiche Eckdaten (EZ + km +-2 % + PS). Schreibt
// data/crosscheck.json mit Gruppen "dasselbe Auto" inklusive Preisverlauf ueber Plattformen.
import fs from 'node:fs';
import path from 'node:path';
const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const db = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'fingerprints.json'), 'utf8'));
const items = Object.entries(db.items).map(([k, v]) => ({ k, ...v }));
const ham = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) { const x = parseInt(a[i], 16) ^ parseInt(b[i], 16); d += [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4][x]; } return d; };
function sameCar(a, b) {
  if (a.vin && b.vin) return a.vin === b.vin ? 'FIN identisch' : null;
  const ha = a.hashes || [], hb = b.hashes || [];
  let hits = 0;
  for (const x of ha) for (const y of hb) if (ham(x.d, y.d) <= 6 || ham(x.p, y.p) <= 6) hits++;
  if (hits >= 2) return hits + ' identische Bilder';
  if (hits === 1 && a.ez && a.ez === b.ez) return '1 identisches Bild + gleiche EZ';
  if (a.ez && b.ez && a.ez === b.ez && a.km && b.km && Math.abs(a.km - b.km) / Math.max(a.km, b.km) < 0.02 && a.ps && a.ps === b.ps && a.url !== b.url) return 'gleiche EZ, km und PS';
  return null;
}
const groups = []; const used = new Set();
for (let i = 0; i < items.length; i++) {
  if (used.has(i)) continue;
  const g = { members: [items[i]], reasons: [] };
  for (let j = i + 1; j < items.length; j++) {
    if (used.has(j)) continue;
    const r = sameCar(items[i], items[j]);
    if (r) { g.members.push(items[j]); g.reasons.push(r); used.add(j); }
  }
  if (g.members.length > 1) { used.add(i); groups.push(g); }
}
const out = { checked_at: new Date().toISOString(), items: items.length, groups: groups.map(g => ({
  reasons: [...new Set(g.reasons)],
  listings: g.members.map(m => ({ url: m.url, src: m.src, title: m.title, first_seen: m.first_seen, last_seen: m.last_seen, prices: m.prices, vin: m.vin, ez: m.ez, km: m.km })),
})) };
fs.writeFileSync(path.join(REPO, 'data', 'crosscheck.json'), JSON.stringify(out, null, 1));
console.log(`crosscheck: ${items.length} Inserate, ${groups.length} Gruppen "dasselbe Auto"`);
for (const g of out.groups) console.log('  ' + g.reasons.join(', ') + ': ' + g.listings.map(l => l.src + ' ' + (l.prices.at(-1)?.p || '?') + '€').join(' | '));
