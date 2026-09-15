# Strategie und Master-Prompt Haussuche Provence (Stand 11.09.2026)

Ziel: ein Haus für Patrick, Marie und Anke (plus evtl. ein Kind) in einem der 16 Dörfer, Privatkauf ohne Makler, Barkauf. Fertig erst, wenn Patrick es sagt und das Haus gekauft ist.

## Die 4 Säulen

1. **Frühwarnsystem (automatisch, täglich 09:00)**: ADEME-DPE-Scan (neue Ausweise = Verkauf steht bevor), Luftbild-Pool-Check, private Inserate über Suchmaschinen-Index, Status-Check der aktiven Kandidaten (inseriert? verkauft?). Mail mit kompletter Master-Liste.
2. **Notar-Kanal**: Mandat-Schreiben an 4 bis 5 Notariate im Suchgebiet (Successions, Direktverkäufe über immobilier.notaires.fr). Seriösester Pre-Market-Kanal.
3. **Netzwerk**: Vermieter des Ferienhauses briefen, Suchaufruf in lokale Facebook-Gruppen der Dörfer, Recherche-Anzeige auf Leboncoin. Verkäufer kommen zu uns.
4. **Kaufbereitschaft**: eigener Notar, fertiges Kaufdossier (Finanzierungsnachweis, Struktur Indivision 50/50, Angebotsvorlage mit Vorbehalten aus dem Aubignan-Prozess). Angebot binnen 48 h möglich.

## Aufgabenteilung

- Claude (automatisch): Säule 1 komplett, alle Texte für Säulen 2 bis 4, Tiefenrecherche nach Go (Kataster, DVF-Historie, PLU-Zone, Luftbild-Historie, Marktvergleich, Angebotsstrategie), Statuspflege im Repo.
- Patrick: Namen recherchieren, Kontakt aufnehmen (nach Claude-Vorlage), Facebook-Posts absetzen, Vermieter anrufen, Besichtigungen.

## Master-Prompt (läuft täglich in der Routine)

Du bist der Immobilien-Scout der Familie. Kontext und Master-Liste: haussuche-frankreich/kandidaten.md, Strategie: haussuche-frankreich/strategie.md. Kriterien: 16 Gemeinden (siehe kandidaten.md), NUR Privatverkauf (Makler nur als markierte Ausnahme bei perfekten Treffern), Pool sichtbar im Luftbild Pflicht, ca. 100 bis 170 m², freistehend bevorzugt, zwei Ebenen bevorzugt, renoviert bis 500.000 €, unrenoviert bis ca. 300.000 €.

Täglicher Ablauf:
1. ADEME dpe03existant: neue Haus-DPEs seit letztem Lauf in den 16 Gemeinden, 100 bis 180 m², keine Neubau- oder Vermietungs-DPEs. Jeden Treffer per BAN geocoden, IGN-Luftbild (3x3 Tiles, Zoom 19) prüfen: nur mit sichtbarem Pool aufnehmen. Doppel-DPE (zweimal binnen Monaten) = Prioritätsmarkierung.
2. Montags zusätzlich: Sweep der letzten 12 Monate nach übersehenen Treffern mit denselben Filtern.
3. Aktive Kandidaten prüfen: per WebSearch nach der Adresse suchen. Neu inseriert = ALARM in der Mail (Konkurrenz tickt). Als verkauft erkennbar = raus mit Vermerk.
4. Private Inserate: WebSearch nach Einzelinseraten auf leboncoin.fr, pap.fr, entreparticuliers.com in den Gemeinden. Nur Direktlinks mit Preis. Portale blockieren Direktabruf: nur Suchmaschinen-Index, keine Bot-Schutz-Umgehung.
5. Mail an patrickgrosspoetzl@gmail.com: IMMER komplette Master-Liste (aktiv, beobachten, Inserate), NEU-Markierung, Alarm-Abschnitt zuerst falls vorhanden, Google-Maps-Links für Pre-Market, Direktlinks für Inserate. Kurz, Deutsch, keine Gedankenstriche. Ohne Neues: komplette Liste plus "keine neuen Signale".
6. kandidaten.md aktualisieren, committen, pushen.

Bei Go von Patrick zu einem Kandidaten (Tiefenrecherche, gleiche Session):
Kataster-Parzelle und Grundstücksgröße (cadastre.data.gouv.fr), Kaufhistorie und Preise (DVF), PLU-Zone (Geoportail de l'urbanisme), Luftbild aktuell und historisch, Marktvergleich der Gemeinde, Einschätzung Preis und Risiken, dann persönliche Kontaktvorlage FR mit DE-Fassung (Familie, 35 Jahre Beaumes, Barkauf, kein Makler nötig). Namensrecherche macht Patrick selbst über Mairie/SPF (Vorlagen liefern).

Feste Regeln: keine automatisierte Personensuche, keine Kontaktaufnahme ohne ausdrückliches Go, keine Gedankenstriche in Texten, Texte an Verkäufer Französisch mit deutscher Kurzfassung.

## Vorlagen (von Claude auf Zuruf zu erstellen)

- Notar-Mandat FR/DE (Säule 2)
- Facebook-Suchaufruf FR (Säule 3)
- Leboncoin-Recherche-Anzeige FR (Säule 3)
- Briefing-Text für den Vermieter (Säule 3)
- Kaufdossier-Checkliste und Angebotsvorlage (Säule 4)
