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

## Mail-Politik (gegen Alert-Fatigue)
Sofort-Mail NUR bei: Score ≥7, ODER ehrlich wirkender Klassiker ≤32k (Glückstreffer-Zone), ODER Preis-Drop eines Watchlist-Autos um ≥2k bzw. unter 35k. Betreff: `[ALERT 8/10] 911 SC Targa 31.5k 1981 privat DE` (ALERT-Prefix ab 8). Score 5-6: nur sammeln für Sonntags-Digest, KEINE Mail. Nichts Neues über der Schwelle und keine fällige Funnel-Aktion → **komplett still**.

Mail-Aufbau für 60-Sekunden-Reaktion, Reihenfolge fix:
1. Offene Funnel-Aktionen (wo ist Nachfassen fällig)
2. tel:-Link falls Nummer im Inserat, sonst Kontakt-Deeplink, plus Inserats-Link
3. Kopierfertiges Anschreiben in Landessprache des Portals + deutsche Version, immer mit den 3 Prüffragen: (a) IMS-Lager ersetzt bzw. beim Kupplungstausch mitgemacht, steht das auf einer Rechnung? (b) Alle Rechnungen einsehbar? (c) Verkaufsgrund + Besichtigung binnen 7 Tagen möglich?
4. Empfehlungsstufe: SOFORT ANRUFEN / ANSCHREIBEN / BEOBACHTEN / FINGER WEG
5. Ein-Zeilen-Preisurteil, effektiver Gesamtpreis, max 3 Red Flags

## Funnel (data/funnel.json)
Felder: url, titel, status (neu/angeschrieben/geantwortet/besichtigung/verworfen/gekauft), datum, naechste_aktion. Bei "angeschrieben" >48h ohne Antwort → Nachfass-Erinnerung ganz oben in der nächsten Mail. Erfolgsmetrik: Antworten und Besichtigungen, nicht gefundene Inserate. Links, die Patrick einkippt (seine Push-Alerts), im nächsten Lauf mit demselben Scoring bewerten und in den Funnel aufnehmen.

## Portal-Health (data/portal-health.json)
Jedes Portal in eigenem try/catch. Ausfall loggen, Lauf fortsetzen. 2 Fails in Folge → stummschalten, nur im Wochen-Digest melden, sonntags re-testen. 0 Treffer bei zuvor liefernder Quelle = "Quelle möglicherweise defekt", nicht "leerer Markt". Kleinanzeigen: MAX 1 Abruf pro Lauf. NIEMALS Suchmaschinen-Snippets als Quelle.

## Entscheidungspunkt 31.10.2026
Wenn bis dahin kein 8/10-Auto unter 30k gekauft oder mindestens besichtigt: Budget auf 33-35k anheben und das Winterfenster Nov-Feb spielen (Saisonabschlag 5-15%, Auswahl an IMS-belegten Autos vervielfacht sich). Nicht mit demselben Filter in den Frühjahrsmarkt 2027 laufen.
