# Haussuche Frankreich

Projekt zur Suche und Bewertung von Häusern in Frankreich.

## Struktur

- `kriterien.md` – Suchkriterien (Budget, Lage, Zustand, Muss/Kann)
- `regionen.md` – Regionen-Shortlist mit Notizen
- `objekte.md` – Gefundene Objekte mit Bewertung
- `links.md` – Nützliche Portale und Ressourcen

## Synchronisation (Mac ↔ Cloud)

Am Mac einmalig:

```bash
git clone https://github.com/pizuwu/pizuwu.github.io.git
cd pizuwu.github.io
git checkout claude/sync-haussuche-frankreich-umu71z
```

Danach vor der Arbeit `git pull`, nach der Arbeit:

```bash
git add haussuche-frankreich
git commit -m "Update Haussuche"
git push
```
