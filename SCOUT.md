# 911-Scout Prozedur (luftgekuehlte Klassiker)

Kanonische Anleitung fuer den stuendlichen Alert-Lauf. Empfaenger: patrickgrosspoetzl@gmail.com.

**WICHTIG: Scoring, Mail-Politik, Funnel-Pflege und Betrugs-Heuristik stehen in REGELN.md und haben Vorrang vor allem, was hier oder im Trigger-Prompt steht. Zulassungsland ist Deutschland (keine NoVA, NL-Arbitrage spielbar). Die Routine ist Backstop- und Analyse-Layer; Erstalarm machen Patricks native Portal-Suchagenten.**

**Das Suchprofil hat am 11.09. gewechselt: NICHT mehr 996, sondern luftgekuehlte Klassiker. Wenn ein Trigger-Prompt noch von "996 bis 31.500 EUR" spricht, ist er veraltet - dieses Dokument und REGELN.md gelten.**

## Suchprofil
- Porsche 911 F-Modell (bis 1973), G-Modell (1974-1989), 964 (1989-1994), 912. Targa bevorzugt, Coupe/Cabrio ok.
- Es zaehlt die Optik, nicht Baujahr oder Laufleistung. Luftgekuehlt ist Pflicht, 993 und alles ab 1995 ist raus.
- Preis: Sofort-Alert bis 32.000 EUR (Glueckstreffer-Zone), Beobachtung bis 45.000 EUR fuers Winterfenster Nov-Feb.
- Laender: DE, AT + Nachbarlaender (NL, BE, FR, IT, LU, DK, PL, CZ), NICHT CH.
- Fahrbereit ist Pflicht und muss belegt sein. Schweissarbeiten sind K.O., Patrick macht nur Kleinigkeiten selbst.
- Rost ist das zentrale Risiko: Wagenheberaufnahmen, Schweller, Batteriekasten, Targa-Fensterrahmen, Scheibenrahmen.
- Keine Kaufgesuche, Teile, Modellautos, Karosserien, Schlachtfahrzeuge, Restaurationsobjekte.
- US-Reimporte ok mit Pruefung (Title, Meilen/km, Sonnenstaaten-Historie).

## Betriebsart: der stuendliche Lauf IST der Scan (geaendert 15.09.)
Ein dauerhafter Hintergrundscanner funktioniert in dieser Umgebung NICHT. Der Prozess wurde am
15.09. zweimal beendet, einmal binnen einer Stunde, weil der Container zwischen den Turns
eingesammelt wird. Ein 5-Minuten-Takt ist hier also nicht lieferbar, und so zu tun als liefe er
ist eine Luege gegenueber Patrick.

Stattdessen: **jeder stuendliche Trigger ruft `node scripts/scan.mjs` einmal direkt auf.** Ohne
CYCLE-Variable zaehlt das Skript selbst in `data/scan-state.json` hoch, dadurch rotieren die
`everyN`-Quellen und die Tippfehler-Suchen auch dann sauber weiter, wenn jeder Lauf ein eigener
Prozess ist. `everyN: 2` heisst damit alle zwei Stunden, `everyN: 3` alle drei.
Kleinanzeigen laeuft jetzt bei `everyN: 1`, also genau ein Abruf pro Stunde, und nimmt pro Lauf
die naechste der 21 Tippfehler-Varianten.

## RUNNER-PIPELINE (seit 16.09., loest die IP-Sperre)
Die Sandbox teilt sich eine Ausgangs-IP, die kleinanzeigen.de sperrt. Deshalb laeuft alles,
was diese IP blockt, als GitHub Action `.github/workflows/ka-scan.yml` (liegt auf master UND
auf dem Arbeits-Branch, Dispatch immer mit ref = Arbeits-Branch). Der Runner committet seine
Ergebnisse als Dateien auf den Arbeits-Branch, der stuendliche Lauf macht `git pull` und liest sie.

**Drei Betriebsarten, alle ueber `mcp__github__actions_run_trigger` (workflow_id ka-scan.yml):**
1. **Neu-Finder** (ohne Inputs, zusaetzlich alle 30 Min per Zeitplan): `scripts/ka-fetch.mjs`
   holt 22 Kleinanzeigen-Suchvarianten bis 58k und schreibt `data/ka-live.json`.
   `scan.mjs` nutzt diese Datei automatisch, wenn sie juenger als 3 h ist (Health: `ka-runner:N@Xh`).
2. **Analyse-Eingang** (Input `url`, mehrere Links durch Leerzeichen getrennt): `scripts/intake-fetch.mjs`
   holt jede Detailseite (auch von Portalen, die die Sandbox blockt) und legt Text + Bild-URLs
   unter `data/intake/<id>.json` ab. Ablauf, wenn Patrick Links schickt: dispatchen, ~90 s warten,
   `git pull`, Datei lesen, Tiefenpruefung wie gewohnt, Antwort im Chat.
3. **Portal-Probe** (Input `probe=true`): `scripts/portal-probe.mjs` testet alle bisher gesperrten
   Portale und Auktionshaeuser vom Runner aus, Ergebnis in `data/portal-probe.json`.

**Bild- und Datenabgleich (jeder Lauf):** `scripts/fingerprint.py` hasht bis zu 8 Bilder pro Inserat
(dHash/pHash), zieht FIN/EZ/km/PS aus dem Text und fuehrt den Preisverlauf. `scripts/crosscheck.mjs`
gruppiert dasselbe Auto ueber Plattformen und Zeit in `data/crosscheck.json`. Vor jeder Bewertung
dort nachsehen: Steht das Auto woanders billiger? Wie lange steht es schon? Wurde der Preis gesenkt?

**Wichtig:** Der Workflow committet nur, wenn `git add` pro Pfad laeuft (Lauf 2 am 16.09. hat sein
Ergebnis verloren, weil ein fehlender Pfad den ganzen add abbrach). Zeitplan-Laeufe arbeiten
explizit auf dem Arbeits-Branch, nicht auf master.

**Konten auf Foren (PFF, elfertreff):** werden NICHT automatisiert angelegt (Captcha, Nutzungs-
bedingungen, es ist Patricks Identitaet). Wenn die Probe zeigt, dass der Runner die oeffentlichen
Marktseiten lesen kann, werden sie als Quelle eingebaut. Konten legt Patrick selbst an.

## Auktionen (neu 15.09., eigener Kanal)
Catawiki versteigert woechentlich Klassiker und spiegelt die Lose auf marktplaats.nl und 2dehands.be,
wo der Scanner drankommt (catawiki.com selbst blockt). Diese Autos sieht Patrick auf kleinanzeigen nie.
Regeln dafuer: Der angezeigte Betrag ist das **aktuelle Gebot, kein Festpreis** und steigt bis zum Zuschlag.
Immer **9 % Kaeuferschutz + 3 EUR** aufschlagen, dazu Transport und deutsche Zulassung. Der genannte
"Geschatte waarde" ist eine Verkaeuferschaetzung und oft zu hoch, immer gegen den echten Markt pruefen.
Ein Gebot ist bindend, deshalb nie ohne Unterbodenfotos oder Besichtigung empfehlen.

## Marktreferenzen (Stand 15.09., selbst erhoben)
- Guenstigster G-Modell-Targa bei Haendlern auf classic-trader: **54.000 EUR**. Alles darunter ist Privatmarkt.
- Fahrbereiter 911 SC Targa privat: 35-45k. Carrera 3.2 Targa: 40-55k. F-Modell Targa: 45k+. 964: 45k+. 912: 30-45k.
- Ein luftgekuehlter Elfer unter 18k existiert als fahrbereites Auto nicht. Solche Preise sind Koeder oder Karosserien.

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
Bei JEDEM Wake zusätzlich: Gmail durchsuchen (`search_threads`) nach neuen Alert-Mails von classicdriver.com, elferspot.com, mobile.de Suchagent, AutoScout24, willhaben, kleinanzeigen Suchauftrag sowie Antworten auf Patricks Gesuche (PFF/elfertreff). Inserats-Links extrahieren, tiefenprüfen (Beschreibung lesen, fahrbereit belegt), dann ins Deck. Die Alert-Mails danach als gelesen behandeln (Label oder Datum in data/mail-cursor.json merken). Damit sind auch alle Portale abgedeckt, die Bots blocken, deren eigene Alerts sind sogar schneller als jeder Scan.

**Geblockt für Direkt-Scraping (auch per Chromium/Proxy nicht erreichbar, NICHT erneut versuchen; Abdeckung über Gmail-Alerts s.o.):** mobile.de direkt, eBay, otomoto.pl, lacentrale.fr, autouncle, bilbasen.dk, gaspedaal.nl, elferspot, classicdriver, zwischengas, elfertreff (403/Connection-Reset auch via Chromium; Egress-Relay kappt Browser-Tunnel). ferdineo.com EXISTIERT NICHT (kein DNS) - war eine Falschangabe aus einer Websuche, PFF-Fahrzeugmarkt ist nur nach Login sichtbar.

## Kleinanzeigen-Sperre NIEMALS nachdruecken (gelernt 15.09.)
Ein 403 auf einer kleinanzeigen-Detailseite wird durch Wiederholungsversuche NICHT besser, sondern zieht die Sperre auf die Suche mit hoch (am 15.09. genau so passiert: nach 5 Detail-Retries war auch die Suchseite 403). Regel: **Pro Lauf genau EIN kleinanzeigen-Abruf. Bei 403 sofort aufhoeren, kein Retry, kein anderer User-Agent.** Inserat mit dem Vermerk "Beschreibung nicht pruefbar" ablegen und im naechsten Lauf tiefenpruefen.

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
