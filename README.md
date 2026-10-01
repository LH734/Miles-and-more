# Meilen-Einlöse-Tracker

Privater Tracker für **aktuell buchbare Einlöse-Angebote von Miles & More**, zunächst nur Flüge.
Eine statische Seite auf GitHub Pages mit 0 € laufenden Kosten. Ohne bezahlte APIs und ohne Login ins Miles-&-More-Konto.

- **Täglicher Lauf** (GitHub Actions, ohne KI): entfernt abgelaufene Angebote und baut die Seite neu.
- **KI-Lauf** (Claude Code mit deinem Claude-Abo): am 3. jedes Monats und auf Abruf. Liest die Primärquellen, prüft Blog-Hinweise,
  ermittelt Barpreise und hält sich an eine einstellbare Obergrenze für Websuchen.
  Lokal mit `/meilen-update`, auf GitHub als Workflow **KI-Lauf**.

**Einrichtung:** siehe [ANLEITUNG.md](ANLEITUNG.md). **Daten und Regeln:** siehe [docs/DATENMODELL.md](docs/DATENMODELL.md).

```bash
npm test          # Tests
npm run build     # Seite nach _site/ bauen
npm run serve     # Vorschau unter http://localhost:8080
```

Ob freie Prämienplätze verfügbar sind, wird nicht geprüft. Maßgeblich sind immer die Angaben bei Miles & More.
