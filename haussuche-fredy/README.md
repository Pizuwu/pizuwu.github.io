# Haussuche Oberursel & Bad Homburg mit fredy

Setup für [fredy](https://github.com/orangecoding/fredy), den selbst gehosteten Immobilien-Finder. Fredy durchsucht ImmoScout24, Immowelt, Kleinanzeigen, Immobilien.de und weitere Portale, entfernt Duplikate und benachrichtigt dich per Telegram, Slack, E-Mail, ntfy oder Discord, sobald ein neues Haus online geht.

## Start

Voraussetzung: Docker ist installiert.

```bash
cd haussuche-fredy
mkdir -p db
docker compose up -d
```

Danach die Web-UI öffnen: http://localhost:9998

Erster Login: Benutzer `admin`, Passwort `admin` (danach sofort ändern).

## Jobs anlegen

In der Web-UI unter "Jobs" einen neuen Job anlegen, z.B. "Haus Oberursel" und "Haus Bad Homburg". Pro Job fügst du die Such-URLs der Portale als Provider hinzu.

### Such-URLs Haus kaufen

**Oberursel (Taunus):**

- ImmoScout24: `https://www.immobilienscout24.de/Suche/de/hessen/hochtaunuskreis/oberursel-taunus/haus-kaufen`
- Immowelt: `https://www.immowelt.de/liste/oberursel-taunus/haeuser/kaufen`
- Kleinanzeigen: `https://www.kleinanzeigen.de/s-haus-kaufen/oberursel/k0c208`
- Immobilien.de: auf immobilien.de nach "Haus kaufen Oberursel" suchen und die Ergebnis-URL kopieren

**Bad Homburg vor der Höhe:**

- ImmoScout24: `https://www.immobilienscout24.de/Suche/de/hessen/hochtaunuskreis/bad-homburg-vor-der-hoehe/haus-kaufen`
- Immowelt: `https://www.immowelt.de/liste/bad-homburg-vor-der-hoehe/haeuser/kaufen`
- Kleinanzeigen: `https://www.kleinanzeigen.de/s-haus-kaufen/bad-homburg/k0c208`
- Immobilien.de: auf immobilien.de nach "Haus kaufen Bad Homburg" suchen und die Ergebnis-URL kopieren

Für **Haus mieten** einfach in den URLs `haus-kaufen` durch `haus-mieten` bzw. `kaufen` durch `mieten` ersetzen (Kleinanzeigen: Kategorie `c205` statt `c208`).

Tipp: Am sichersten ist es, die Suche einmal selbst im Browser mit deinen Filtern (Preis, Fläche, Zimmer, Umkreis) durchzuführen und die URL aus der Adresszeile in fredy einzufügen. Fredy übernimmt alle Filter aus der URL.

### Umkreis

Beide Orte liegen im Hochtaunuskreis direkt nebeneinander. Alternativ zu zwei Jobs kannst du auf ImmoScout24 eine Umkreissuche (z.B. Oberursel + 5 km) einstellen, dann deckt ein Job beide Städte ab.

## Benachrichtigungen

Im Job unter "Notification Adapters" z.B. Telegram konfigurieren:

1. Bei [@BotFather](https://t.me/BotFather) einen Bot erstellen, Token kopieren.
2. Dem Bot schreiben, dann über `https://api.telegram.org/bot<TOKEN>/getUpdates` die Chat-ID auslesen.
3. Token und Chat-ID im Adapter eintragen.

## Hinweise

- ImmoScout24 nutzt fredy über die reverse-engineerte Mobile-API, dadurch sehr zuverlässig. Details im [fredy-README](https://github.com/orangecoding/fredy#immoscout).
- Suchintervall und Arbeitszeiten (z.B. nur 7 bis 22 Uhr) lassen sich in den fredy-Einstellungen konfigurieren.
- Die Daten liegen in `./db` (SQLite), Backup = Ordner kopieren.
