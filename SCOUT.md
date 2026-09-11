# 911-Scout Prozedur (996 bis 30k)

Kanonische Anleitung für den stündlichen Alert-Lauf. Empfänger: patrickgrosspoetzl@gmail.com.

**WICHTIG: Scoring, Mail-Schwellen (Mail nur ab Score ≥7 bzw. Sonderregeln!), Funnel-Pflege und Betrugs-Heuristik stehen in REGELN.md und haben Vorrang vor allem, was hier oder im Trigger-Prompt steht. Preisfilter jetzt bis 33.000 € (31.5-33k = Verhandlungsziel). Zulassungsland ist Deutschland (keine NoVA, NL-Arbitrage spielbar). Die Routine ist Backstop- und Analyse-Layer; Erstalarm machen Patricks native Portal-Suchagenten.**

## Suchprofil
- Porsche 911, Generation 996 (EZ 1997-2005), alle Karosserien (Coupé/Targa/Cabrio), Getriebe egal
- Preis: bis 30.000 € hart; 30.000-31.500 € nur erwähnen wenn verhandelbar wirkend
- Länder: DE, AT + Nachbarländer (NL, BE, FR, IT, LU, DK, PL, CZ), NICHT CH
- Zustand vor Laufleistung; Muss-Kriterien: IMS-Lager ersetzt/geprüft, großer Service frisch
- Keine Kaufgesuche, Teile, Modellautos, Schlachtfahrzeuge

## Quellen (Stand 2026-09-11)

Alle Abrufe per `curl -sS -L --max-time 25` (WebFetch wird von den meisten geblockt, curl direkt funktioniert bei diesen):

| Quelle | URL | Parsing |
|---|---|---|
| Kleinanzeigen | `https://www.kleinanzeigen.de/s-autos/preis::31500/porsche-996/k0c216` | HTML: `<article class="aditem" data-adid data-href>`, Preis-Klasse `aditem-main--middle--price-shipping--price`, Tags km + "EZ MM/JJJJ". Präfix `https://www.kleinanzeigen.de`. ACHTUNG: rate-limited, max 1 Abruf/Lauf; 403 "IP-Bereich gesperrt" = temporär, kein Fehler des Inserats |
| AutoScout24 DE | `https://www.autoscout24.de/lst/porsche/911?atype=C&priceto=31500&fregfrom=1997&fregto=2005&cy=D&damaged_listing=exclude` (+`&page=2`) | `__NEXT_DATA__` JSON: `props.pageProps.listings[]`: url, price.priceRaw, vehicle.mileageInKm, vehicleDetails(calendar=EZ), location, seller.type |
| AutoScout24 AT | `https://www.autoscout24.at/lst/porsche/911?atype=C&priceto=31500&fregfrom=1997&fregto=2005` | wie DE, Präfix `.at` |
| AutoScout24 Nachbarn | wie DE aber `cy=NL%2CB%2CF%2CI%2CL` | wie DE |
| willhaben AT | `https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse?CAR_MODEL%2FMAKE=Porsche&PRICE_TO=31500&YEAR_MODEL_FROM=1997&YEAR_MODEL_TO=2005` | `__NEXT_DATA__`: `props.pageProps.searchResult.advertSummaryList.advertSummary[]`, attributes.attribute: PRICE/AMOUNT, MILEAGE, YEAR_MODEL, CAR_MODEL/MAKE==Porsche, SEO_URL (URL=`https://www.willhaben.at/iad/`+Wert), AUTDEALER |
| 12gebrauchtwagen (aggregiert mobile.de!) | `https://www.12gebrauchtwagen.de/auto/porsche/996?page=1..3` | HTML-Blöcke um `c/partner?offer_id=`; finale mobile.de-URL via `curl -w "%{url_effective}"` auflösen |
| sauto.cz | `https://www.sauto.cz/inzerce/osobni/porsche/911` | CZK, Kurs ~25.2 CZK/EUR |
| heycar | `https://hey.car/gebrauchtwagen/porsche/911` | NEXT_DATA/JSON-LD |
| automobile.it | `https://www.automobile.it/porsche-911` | HTML/JSON |
| gebrauchtwagen.de | `https://www.gebrauchtwagen.de/porsche/911` | HTML |
| marktplaats NL | `https://www.marktplaats.nl/l/auto-s/porsche/f/911/10898/` | HTML, "Bieden"-Angebote ohne Preis weglassen |
| 2dehands BE | `https://www.2dehands.be/l/auto-s/q/porsche+996/` | wie marktplaats |

| classic-trader | `https://www.classic-trader.com/de/automobile/suche/porsche/911/g-modell?sort=price_asc` (+`/urmodell`, `/912`) | ld+json `SearchResultsPage` → ItemList mit Car-Objekten (url, offers.price, mileage, Jahr). Günstigste zuerst dank sort=price_asc |

## Gmail-Alert-Ingestion (Quellen, die Scraping blocken)
Bei JEDEM Wake zusätzlich: Gmail durchsuchen (`search_threads`) nach neuen Alert-Mails von classicdriver.com, elferspot.com, mobile.de Suchagent, AutoScout24, willhaben, kleinanzeigen Suchauftrag sowie Antworten auf Patricks Gesuche (ferdineo/elfertreff/PFF). Inserats-Links extrahieren, tiefenprüfen (Beschreibung lesen, fahrbereit belegt), dann ins Deck. Die Alert-Mails danach als gelesen behandeln (Label oder Datum in data/mail-cursor.json merken). Damit sind auch alle Portale abgedeckt, die Bots blocken, deren eigene Alerts sind sogar schneller als jeder Scan.

**Geblockt für Direkt-Scraping (auch per Chromium/Proxy nicht erreichbar, NICHT erneut versuchen; Abdeckung über Gmail-Alerts s.o.):** mobile.de direkt, eBay, otomoto.pl, lacentrale.fr, autouncle, bilbasen.dk, gaspedaal.nl, elferspot, classicdriver, zwischengas, ferdineo, elfertreff (403/Connection-Reset auch via Chromium; Egress-Relay kappt Browser-Tunnel).

## Eiserne Regel: Nur Verifiziertes in die Mail
Jedes Inserat in der Mail MUSS im selben Lauf verifiziert sein:
1. `curl -sS -o /tmp/v.html -w "%{http_code}|%{url_effective}" -L <url>`
2. HTTP 200 + Titel-Kernwörter + Preis (±5%) im Body → **live geprüft ✅**
3. 12gw-Partner-Link → finale URL auflösen; mobile.de-Ziel blockt Bots → **heute auf Aggregator gelistet ⚠️** (so in Mail kennzeichnen)
4. Kleinanzeigen bei IP-Sperre: nur Inserate melden, die in einem im selben Lauf frisch abgerufenen Suchergebnis stehen → **in Live-Suche bestätigt ✅**
5. Alles andere (tot, "nicht mehr verfügbar", unklar, nur aus Suchmaschinen-Snippets): **NICHT in die Mail.** Suchmaschinen-Snippets sind NIE eine Quelle.
6. Jedes Inserat in der Mail braucht einen funktionierenden Link (bei 12gw: die aufgelöste finale URL verlinken).

## Ablauf pro Lauf (stündlich)
1. `git pull origin claude/porsche-911-targa-finder-rkqc9w`, `data/seen-listings.json` lesen
2. Quellen abrufen, Inserate ≤31.500 € extrahieren, Dedupe (URL bzw. Titel+Preis+km) gegen seen-listings.json UND innerhalb des Laufs
3. Neue Kandidaten verifizieren (Regel oben), bewerten: Preis-Einschätzung (gesunder 996-Markt 30-45k; unter 25k meist >180tkm/Wartungsstau; Tiptronic 2-4k billiger; Cabrio < Coupé), Red Flags (IMS unklar, keine Historie, Baujahr 97-99 Motorrisiko, Import), Score 0-10
4. **Nur wenn neue verifizierte Inserate existieren**: HTML-Mail via Gmail an patrickgrosspoetzl@gmail.com, Betreff `🚨 911-Alert: N neue 996 (HH:MM)`. Pro Inserat: Titel, Preis, km, EZ, Ort, Land, Quelle, Verifikations-Badge, funktionierender Link, 💡 Einschätzung, ⚠️ Red Flags. Für Top-Treffer (Score ≥7) kopierfertiges Anschreiben (Fragen: Historie/Scheckheft, IMS mit Beleg, RMS-Ölfeuchte, letzter großer Service, unfallfrei, Besichtigung/PPI erlaubt; Gruß "Patrick"). Keine neuen Treffer = KEINE Mail, still bleiben.
5. Neue Inserate in `data/seen-listings.json` eintragen (`first_seen`, `verified`-Feld), committen, `git push -u origin claude/porsche-911-targa-finder-rkqc9w`. Keine PRs.
