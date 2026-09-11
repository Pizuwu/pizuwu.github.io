# 911-Scout Regelwerk (Scoring, Mail-Politik, Funnel)

Einzige Wahrheitsquelle neben SCOUT.md (Prozedur/Quellen). Stand: 2026-09-11. Zulassungsland: **Deutschland** (entschieden), daher keine NoVA; NL/BE-Import kostet nur ~300-600 € Überführung, NL-Arbitrage ist voll spielbar.

## Rollenverständnis
Die Claude-Routine ist **Backstop- und Analyse-Layer, nicht Erstalarm**. Patricks native Portal-Suchagenten (mobile.de, kleinanzeigen, willhaben, AutoScout24, eBay) pushen in Minuten und übernehmen den Erstalarm. Mehrwert der Routine: Auslands- und Nischenportale, Scoring, Gesamtkostenrechnung, Anschreiben, Funnel-Pflege, Preis-Drop-Tracking.

## Suchraum
Porsche 996, EZ 1997-2005, Karosserie und Getriebe egal. Preisfilter bis **33.000 €**; 31.5-33k als "Verhandlungsziel" kennzeichnen. Budget: 30k hart als **Gesamtkosten** verstanden (siehe Gesamtpreis).

## Scoring (1-10)
- **IMS ist Preisfaktor und Erstkontakt-Frage, KEIN K.O.-Filter.** Die Rechnung liegt im Ordner des Verkäufers, nicht im Inseratstext. Fehlender IMS-Hinweis tötet den Score nicht.
  - IMS belegt: +1.5
  - IMS unbekannt: neutral, aber 2.500 € Reserve in den Gesamtpreis rechnen und Anschreiben-Frage priorisieren
  - 996.1 bis MJ2000 (robustes Doppelreihenlager, ~1% Ausfall): +0.5
  - 996.2 ohne IMS-Beleg: -0.5
  - "Kupplung/Simmerring neu" = High-Signal (Getriebe war draußen, EINE Rechnung klärt IMS): +0.5 + Pflichtfrage
- Volle Historie mit Rechnungen +1.5, großer Service frisch +1, privat +0.5
- Hart disqualifizierend NUR: ungeklärter Unfall, nicht beschaffbare Historie, Motorschaden-Indizien, Betrugsverdacht
- **Betrugs-Heuristik**: Preis >20% unter Markt + privat + Fernabwicklung/Spedition + wenige Fotos → Score-Deckel 4, Hinweis "Rückwärts-Bildersuche, keine Anzahlung". Link-lebt ≠ Inserat-echt.
- **Gesamtpreis** je Kandidat ausweisen: Kaufpreis + Überführung (NL/BE ~300-600 €) + 2.500 € IMS-Reserve falls unbelegt. Über 30k → klar "über Budget" markieren. Zielzone: 7/10-Autos ohne IMS-Beleg bei 26-27k abschließen.

## Mail-Politik (gegen Alert-Fatigue)
Sofort-Mail NUR bei: Score ≥7, ODER (privat + Historie + ≤27k), ODER (Gesamtpreis ≤30k inkl. Reserven). Betreff: `[ALERT 8/10] 996.2 Schalter 28.5k NL privat 166tkm` (ALERT-Prefix ab 8). Score 5-6: nur sammeln für Sonntags-Digest, KEINE Mail. Nichts Neues über der Schwelle und keine fällige Funnel-Aktion → **komplett still**.

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
