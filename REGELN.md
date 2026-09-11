# 911-Scout Regelwerk (Scoring, Mail-Politik, Funnel)

Einzige Wahrheitsquelle neben SCOUT.md (Prozedur/Quellen). Stand: 2026-09-11. Zulassungsland: **Deutschland** (entschieden), daher keine NoVA; NL/BE-Import kostet nur ~300-600 € Überführung, NL-Arbitrage ist voll spielbar.

## Rollenverständnis
Die Claude-Routine ist **Backstop- und Analyse-Layer, nicht Erstalarm**. Patricks native Portal-Suchagenten (mobile.de, kleinanzeigen, willhaben, AutoScout24, eBay) pushen in Minuten und übernehmen den Erstalarm. Mehrwert der Routine: Auslands- und Nischenportale, Scoring, Gesamtkostenrechnung, Anschreiben, Funnel-Pflege, Preis-Drop-Tracking.

## Suchraum (NEU seit 11.09. nachmittags: KLASSIKER, Look-basiert!)
Patrick will den klassischen luftgekühlten Look (Bild: G-Modell Targa weinrot, ER Classics): **911 F-Modell (bis 1973), G-Modell (1974-1989), 964 (1989-1994), 912**. Targa bevorzugt, Coupé/Cabrio ok. Es zählt Optik, nicht Baujahr/Laufleistung. Fahrbereit, kleine Arbeiten selbst machbar, KEINE Schweiß-Projekte. US-Reimporte ok mit Prüfung (Title, Meilen/km, Sonnenstaaten-Historie = wenig Rost; H-Kennzeichen ab 30 Jahren = günstige Steuer/Versicherung). Der 996 ist NICHT mehr Ziel (zu modern), Daten bleiben archiviert.

**Budget-Strategie (Patricks Entscheidung):** Sparen bis Winter, parallel Glückstreffer jagen. Fahrbereite G-Targa kosten real 35-45k. Darum: **Sofort-Alert bei ehrlich wirkenden Fahrzeugen bis 32k** (Glückstreffer-Zone), **Beobachtung bis 45k** mit Preis-Drop-Alerts fürs Winterfenster Nov-Feb (5-15% Saisonabschlag). Scan läuft dauerhaft alle 10 Minuten.

## Scoring Klassiker (1-10)
- **ROST ist beim Luftgekühlten das, was IMS beim 996 war**: Wagenheberaufnahmen, Schweller, Kotflügel-Kanten, Batteriekasten, Targa-Fensterrahmen, Windschutzscheibenrahmen. Schweißarbeiten = K.O. (Patrick schraubt nur Kleinigkeiten selbst). "Rostfrei" ohne Fotos der Unterseite = Frage, nicht Fakt.
- Positiv: Matching Numbers +1, deutsche Auslieferung/Historie +1, Wertgutachten aktuell +0.5, lange Vorbesitz-Dauer +0.5, Targa +0.5 (Patricks Wunsch), belegter Motorzustand (Kompression) +0.5, trockener Sonnenstaaten-US-Import +0.5
- Negativ: km unklar/999999 = Projektverdacht -2, "Restaurierungsbasis/Projekt" = raus (außer explizit fahrbereit), Tacho in Meilen ohne Beleg -0.5, SC-Kettenspanner nicht auf Carrera-Spanner umgerüstet = Frage + 1k Reserve
- **Betrugs-Heuristik verschärft**: Klassiker sind Fake-Magnet. Preis >25% unter Markt (2.4S unter 60k, F-Targa unter 35k, SC-Targa unter 30k, 3.2 Carrera unter 35k) → Score-Deckel 3, erst Rückwärts-Bildersuche und Anruf. "911 Junior" (Kinderauto), Porsche-Diesel-Traktoren und Replikas rausfiltern.
- **Gesamtpreis**: Kaufpreis + Überführung + bei US-Import ggf. Umrüstung/TÜV-Abnahme (500-1.500 €) + 2-3k Puffer erste Wartungsrunde. Marktreferenzen: 911 SC Targa fahrbereit 35-45k, Carrera 3.2 Targa 40-55k, F-Modell Targa 45k+, 964 45k+, 912 30-45k.

## GELERNT AM 11.09. (aus Patricks Feedback, bindend)
1. **Billig ist bei Klassikern das Warnsignal, nicht der Treffer.** Fahrbereite klassische Targa beginnen bei ~38k. Alles deutlich darunter ist Karosserie, Projekt oder Köder (bewiesen: 2.2T Targa 28.9k = Motor dreht nur von Hand; 1968er 24.9k = komplett restaurierungsbedürftig; 912 21k = nackte Karosserie ohne Motor).
2. **NICHTS erreicht Patrick ohne Tiefenprüfung**: Beschreibung der Detailseite lesen, fahrbereit muss belegt sein (TÜV/Pickerl, "fahrbereit", H-Zulassung, aktuelle Nutzung). Titel-Scan reicht NIE.
3. **Swipe-Semantik**: ja = kontaktieren/Anschreiben; **winter = gefällt, aber zu teuer: NICHT verwerfen, sondern auf die persönliche Preis-Drop-Watchlist** (Alert bei Senkung ≥2k oder im Winterfenster aktiv nachverhandeln); nein = passt nicht (Gründe auswerten und als Filterregel eintragen). Patrick will minimalen Aufwand: Er swipet im Targa Deck (Artifact https://claude.ai/code/artifact/a160aa7d-4852-48d3-a09b-8dd8aa7de884, DB-Collections `deck` und `swipes`). Bei JEDEM Wake: `swipes` mit gelesen=false lesen, daraus lernen (Nein-Gründe = neue Filterregeln hier eintragen!), gelesen=true setzen, Ja-Autos in funnel.json + Anschreiben-Mail, neue tiefengeprüfte Autos per write_db in `deck` nachlegen (rank fortlaufend). Wake-Subscription aufs Artifact ist in dieser Umgebung nicht verfügbar, also Swipes aktiv pollen bei jedem Lauf.

## Mail-Politik (Patricks Entscheidung 11.09. abends: NUR EINE TÄGLICHE MAIL)
Genau EINE Mail pro Tag, beim ersten Wake nach 05:00 UTC (~7:30 lokal), Versand-Datum in data/state.json (last_daily_mail) festhalten, an anderen Wakes KEINE Mail. Inhalt: ALLE aktuell aktiven, tiefengeprüften Autos als Rangliste mit Link, Preis, km, EZ, Ort, 1-Zeilen-Einschätzung; NEU-Badge für Funde der letzten 24h; Preis-Drops hervorheben; rausgefallene (verkauft) kurz vermerken. Das Swipe-Deck bleibt online (Link im Footer), ist aber optional; Swipes weiterhin auswerten falls vorhanden. Keine Sofort-Alerts mehr; einzige Ausnahme wäre ein von Patrick ausdrücklich als JA markiertes Auto mit Preis-Drop. Betreff: `[ALERT 8/10] 911 SC Targa 31.5k 1981 privat DE` (ALERT-Prefix ab 8). Score 5-6: nur sammeln für Sonntags-Digest, KEINE Mail. Nichts Neues über der Schwelle und keine fällige Funnel-Aktion → **komplett still**.

Mail-Aufbau für 60-Sekunden-Reaktion, Reihenfolge fix:
1. Offene Funnel-Aktionen (wo ist Nachfassen fällig)
2. tel:-Link falls Nummer im Inserat, sonst Kontakt-Deeplink, plus Inserats-Link
3. Kopierfertiges Anschreiben in Landessprache des Portals + deutsche Version, immer mit den Prüffragen: (a) Rost: Zustand Schweller, Wagenheberaufnahmen, Batteriekasten, Fotos der Unterseite? (b) Matching Numbers, Historie, Wertgutachten vorhanden? (c) Bei US-Import: Title, Einfuhrbelege, Meilen oder km? (d) Verkaufsgrund + Besichtigung binnen 7 Tagen möglich?
4. Empfehlungsstufe: SOFORT ANRUFEN / ANSCHREIBEN / BEOBACHTEN / FINGER WEG
5. Ein-Zeilen-Preisurteil, effektiver Gesamtpreis, max 3 Red Flags

## Funnel (data/funnel.json)
Felder: url, titel, status (neu/angeschrieben/geantwortet/besichtigung/verworfen/gekauft), datum, naechste_aktion. Bei "angeschrieben" >48h ohne Antwort → Nachfass-Erinnerung ganz oben in der nächsten Mail. Erfolgsmetrik: Antworten und Besichtigungen, nicht gefundene Inserate. Links, die Patrick einkippt (seine Push-Alerts), im nächsten Lauf mit demselben Scoring bewerten und in den Funnel aufnehmen.

## Portal-Health (data/portal-health.json)
Jedes Portal in eigenem try/catch. Ausfall loggen, Lauf fortsetzen. 2 Fails in Folge → stummschalten, nur im Wochen-Digest melden, sonntags re-testen. 0 Treffer bei zuvor liefernder Quelle = "Quelle möglicherweise defekt", nicht "leerer Markt". Kleinanzeigen: MAX 1 Abruf pro Lauf. NIEMALS Suchmaschinen-Snippets als Quelle.

## Entscheidungspunkt 31.10.2026
Wenn bis dahin kein überzeugender Klassiker unter 32k gekauft oder mindestens besichtigt: gezielt fürs Winterfenster Nov-Feb sparen (Ziel 38-45k) und dort mit Saisonabschlag 5-15% auf die Watchlist-Autos gehen. Nicht mit demselben Filter in den Frühjahrsmarkt 2027 laufen, dann ziehen die Preise wieder an.
