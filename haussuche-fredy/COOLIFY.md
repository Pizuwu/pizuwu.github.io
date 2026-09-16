# fredy auf Hetzner mit Coolify deployen

Schritt-für-Schritt-Anleitung, um die Haussuche für Oberursel und Bad Homburg dauerhaft laufen zu lassen.

## 1. Server

Falls Coolify schon läuft, überspring diesen Schritt und geh zu Punkt 2.

fredy startet für die Portale ein eigenes Chromium und braucht dafür rund 1 GB RAM. Zusammen mit Coolify selbst (mindestens 2 GB) solltest du also mindestens 4 GB haben:

- **CX22** (2 vCPU, 4 GB RAM, 40 GB Disk): reicht für Coolify plus fredy
- **CX32** (4 vCPU, 8 GB RAM, 80 GB Disk): entspannter, wenn noch andere Projekte mitlaufen

Hetzner hat die Cloud-Preise Mitte 2026 angehoben, den aktuellen Preis bitte direkt auf hetzner.com prüfen. Als Standort Nürnberg oder Falkenstein wählen, als Image Ubuntu 24.04.

Coolify installieren:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Danach Coolify unter `http://<server-ip>:8000` öffnen und den Admin-Account anlegen.

## 2. Repository in Coolify anlegen

In Coolify: **Projects → New Resource → Docker Compose** (Quelle: Public Repository).

| Feld | Wert |
| --- | --- |
| Repository URL | `https://github.com/Pizuwu/pizuwu.github.io` |
| Branch | `master` (bzw. der Branch mit diesem Ordner) |
| Docker Compose Location | `/haussuche-fredy/docker-compose.coolify.yml` |

Coolify liest die Compose-Datei ein und legt die beiden Volumes `fredy-db` und `fredy-conf` an. Unter **Configuration → Persistent Storage** tauchen sie auf, sind dort aber schreibgeschützt, weil sie aus der Compose-Datei stammen. Das ist so gewollt und sorgt dafür, dass deine Datenbank Deployments überlebt.

## 3. Domain

Die Compose-Datei enthält `SERVICE_FQDN_FREDY_9998`. Coolify erzeugt daraus beim ersten Deploy automatisch eine Domain und routet sie auf Port 9998 im Container. Willst du eine eigene Domain, trägst du sie unter **Configuration → Domains** ein, inklusive Port-Suffix:

```
https://fredy.deine-domain.de:9998
```

Das `:9998` sagt Coolify nur, welcher Container-Port gemeint ist. Nach außen bleibt es normales HTTPS auf Port 443, das Zertifikat holt Coolify per Let's Encrypt automatisch.

DNS: einen A-Record von `fredy.deine-domain.de` auf die Server-IP setzen, bevor du deployst.

## 4. Deploy

**Deploy** klicken. Der erste Start dauert ein bis zwei Minuten, weil das Image rund 1 GB groß ist.

Eine Konfigurationsdatei musst du nicht anlegen. fredy schreibt `conf/config.json` beim ersten Start selbst mit den Standardwerten (Datenbank unter `/db`).

## 5. Erster Login

Domain aufrufen, einloggen mit Benutzer `admin` und Passwort `admin`, danach **sofort** in den Einstellungen das Passwort ändern. Die Instanz ist über die Domain öffentlich erreichbar.

## 6. Suchjobs anlegen

Die fertigen Such-URLs für Oberursel und Bad Homburg stehen im [README](./README.md) dieses Ordners. In der fredy-Oberfläche unter **Jobs** einen Job pro Stadt anlegen und die URLs als Provider eintragen.

Danach unter **Notification Adapters** Telegram konfigurieren, damit neue Häuser direkt aufs Handy kommen.

## Betrieb

- **Updates**: In Coolify auf **Redeploy** klicken, das zieht das aktuelle `latest`-Image. Wer automatische Updates will, aktiviert in Coolify den Watchtower beziehungsweise die automatische Image-Aktualisierung.
- **Backup**: Die komplette Suchhistorie liegt im Volume `fredy-db` als SQLite-Datei. Coolify kann das Volume sichern, alternativ auf dem Server `docker run --rm -v fredy-db:/db -v $PWD:/backup alpine tar czf /backup/fredy-db.tar.gz /db`.
- **Logs**: In Coolify unter **Logs**, dort siehst du jeden Suchlauf und eventuelle Blockaden durch die Portale.
- **Speicher**: Das Limit steht auf 1 GB. Wenn Chromium im Log wegen Speichermangel abbricht, den Wert in der Compose-Datei erhöhen.
