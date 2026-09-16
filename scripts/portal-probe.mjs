#!/usr/bin/env node
// Erreichbarkeitstest vom GitHub-Runner aus fuer alle Portale, die die Sandbox blockt.
// Schreibt data/portal-probe.json mit HTTP-Code, Groesse und ob Inserats-Marker im HTML sind.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const REPO = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PORTALE = [
  ['mobile.de', 'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&makeModelVariant1.makeId=20100&makeModelVariant1.modelId=13&maxPrice=58000&maxFirstRegistrationDate=1994-12-31', /"vehicle|mobile\.de\/fahrzeuge\/details/i],
  ['elferspot', 'https://www.elferspot.com/de/suche/?q=targa', /elferspot\.com\/de\/(inserat|fahrzeug)|class="[^"]*(car|listing)/i],
  ['classicdriver', 'https://www.classicdriver.com/de/cars?make=porsche&model=911&price_max=58000', /classicdriver\.com\/de\/car\//i],
  ['zwischengas', 'https://www.zwischengas.com/de/markt/auto/porsche/911', /zwischengas\.com\/de\/(markt|inserat)/i],
  ['elfertreff', 'https://www.elfertreff.de/marktplatz', /marktplatz|inserat/i],
  ['pff', 'https://www.pff.de/fahrzeugmarkt', /fahrzeug|inserat/i],
  ['autouncle', 'https://www.autouncle.de/de/gebrauchtwagen/porsche/911?price_max=58000&year_max=1994', /autouncle\.de\/de\/gebrauchtwagen\/[a-z0-9-]+\/\d/i],
  ['ebay', 'https://www.ebay.de/sch/i.html?_nkw=porsche+911+targa&_sacat=9801&_udhi=58000', /ebay\.de\/itm\//i],
  ['catawiki', 'https://www.catawiki.com/de/c/423-oldtimer?q=porsche%20911', /catawiki\.com\/de\/l\//i],
  ['kleinanzeigen', 'https://www.kleinanzeigen.de/s-autos/preis::58000/porsche-targa/k0c216', /data-adid=/],
  ['lacentrale', 'https://www.lacentrale.fr/listing?makesModelsCommercialNames=PORSCHE%3A911&priceMax=58000', /lacentrale\.fr\/auto-occasion-annonce/i],
  ['gaspedaal', 'https://www.gaspedaal.nl/porsche/911?pmax=58000', /gaspedaal\.nl\/porsche\/911\//i],
  ['otomoto', 'https://www.otomoto.pl/osobowe/porsche/911?search%5Bfilter_float_price%3Ato%5D=58000', /otomoto\.pl\/osobowe\/oferta/i],
  ['bilbasen', 'https://www.bilbasen.dk/brugt/bil/porsche/911', /bilbasen\.dk\/brugt\/bil\/porsche\/911\//i],
  ['sauto', 'https://www.sauto.cz/inzerce/osobni/porsche/911', /sauto\.cz\/osobni\/detail/i],
  ['oldtimermarkt', 'https://www.oldtimermarkt.de/', /oldtimer/i],
  // Auktionshaeuser: Ziel ist der Einlieferer-Kontakt nach erfolgloser Auktion, nicht das Bieten
  ['troostwijk', 'https://www.troostwijkauctions.com/de/l/oldtimer?q=porsche', /troostwijkauctions\.com\/de\/(a|l)\//i],
  ['vavato', 'https://vavato.com/de/c/fahrzeuge?q=porsche', /vavato\.com\/de\/(a|l)\//i],
  ['dorotheum', 'https://www.dorotheum.com/de/k/oldtimer/', /dorotheum\.com\/de\/l\//i],
  ['osenat', 'https://www.osenat.com/fr/ventes/automobiles', /osenat\.com\/fr\/(lot|vente)/i],
  ['aguttes', 'https://www.aguttes.com/departement/automobiles-de-collection', /aguttes\.com\/(lot|vente)/i],
  ['bonhams', 'https://cars.bonhams.com/search/?q=porsche%20911', /bonhams\.com\/auction/i],
  ['classicbid', 'https://www.classicbid.de/', /classicbid\.de\/(lot|auktion|fahrzeug)/i],
  ['autobid', 'https://autobid.de/de/', /autobid\.de/i],
  ['carandclassic', 'https://www.carandclassic.com/search?q=porsche%20911%20targa', /carandclassic\.com\/car\//i],
  ['classiccarsforsale', 'https://www.classic-trader.com/de/auktionen', /classic-trader\.com\/de\/auktion/i],
  // Zweitversuche mit anderen Pfaden (erster Lauf: 404 mit Inhalt = Seite erreichbar, Pfad falsch)
  ['elferspot-2', 'https://www.elferspot.com/de/', /elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\//i],
  ['elferspot-3', 'https://www.elferspot.com/de/porsche/911-g-modell/', /elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\//i],
  ['elferspot-4', 'https://www.elferspot.com/de/?s=targa', /elferspot\.com\/de\/[a-z0-9-]+\/[a-z0-9-]+\//i],
  ['troostwijk-2', 'https://www.troostwijkauctions.com/de/c/oldtimer', /troostwijkauctions\.com\/de\/[al]\//i],
  ['troostwijk-3', 'https://www.troostwijkauctions.com/de/', /troostwijkauctions\.com\/de\/[al]\//i],
  ['vavato-2', 'https://vavato.com/de', /vavato\.com\/de\/[al]\//i],
  ['pff-2', 'https://www.pff.de/', /fahrzeugmarkt|marktplatz|inserat/i],
  ['pff-3', 'https://www.pff.de/marktplatz/', /fahrzeug|inserat/i],
  ['elfertreff-2', 'https://elfertreff.de/', /marktplatz|inserat/i],
  ['classicbid-2', 'https://www.classicbid.de/fahrzeuge/', /classicbid\.de\/(lot|auktion|fahrzeug)/i],
];
const out = { probed_at: new Date().toISOString(), runner: process.env.GITHUB_RUN_ID || 'lokal', results: [] };
for (const [name, url, marker] of PORTALE) {
  let code = 0, size = 0, hits = 0, blocked = false;
  try {
    const raw = execFileSync('curl', ['-sS', '-L', '--max-time', '25', '--compressed', '-A', UA,
      '-H', 'Accept-Language: de-DE,de;q=0.9', '-o', '-', '-w', '\n@@HTTP@@%{http_code}', url],
      { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
    const i = raw.lastIndexOf('\n@@HTTP@@');
    code = parseInt(raw.slice(i + 9), 10); const body = raw.slice(0, i); size = body.length;
    hits = (body.match(new RegExp(marker.source, marker.flags + 'g')) || []).length;
    blocked = /IP-Bereich|access denied|captcha|are you a human|bot detection|cloudflare/i.test(body) && hits === 0;
  } catch (e) { code = 0; }
  out.results.push({ name, url, code, size, marker_hits: hits, blocked });
  console.log(`${name.padEnd(14)} http=${code} size=${size} treffer=${hits}${blocked ? ' GESPERRT' : ''}`);
  await new Promise(r => setTimeout(r, 1500));
}
fs.mkdirSync(path.join(REPO, 'data'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'data', 'portal-probe.json'), JSON.stringify(out, null, 1));
