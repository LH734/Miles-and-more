# Anleitung: Meilen-Einlöse-Tracker einrichten

Diese Anleitung führt dich Schritt für Schritt durch die Einrichtung, ohne Vorkenntnisse.
Du brauchst nur einen Browser, deinen GitHub-Zugang und für den KI-Lauf deinen Mac mit Claude-Abo (Pro oder Max).
Es fallen keine Kosten an.

---

## 1. Repo öffentlich machen

GitHub Pages ist für öffentliche Repos kostenlos.

1. Öffne <https://github.com/LH734/Miles-and-more>.
2. **Settings** → ganz unten **Danger Zone** → **Change visibility** → **Public**.

> Öffentlich sind nur der Code und die Angebotsdaten. Dein Claude-Token liegt als „Secret“ verschlüsselt bei GitHub und ist nicht sichtbar.

## 2. Branch `main` als Standard festlegen

Der Code liegt zunächst auf dem Branch `claude/miles-more-tracker-hqen5l`. Die Zeitpläne laufen nur auf dem Standard-Branch,
und die Seite wird nur von `main` aus veröffentlicht.

1. Auf der Repo-Startseite links oben auf das Branch-Feld klicken (zeigt den aktuellen Branch).
2. `main` eintippen → **Create branch main from claude/miles-more-tracker-hqen5l**.
3. **Settings** → **General** → **Default branch** → Pfeil-Symbol → `main` wählen → **Update**.

## 3. GitHub Pages einschalten

1. **Settings** → **Pages**.
2. Bei **Build and deployment** → **Source**: **GitHub Actions** auswählen.

## 4. Schreibrechte für die Läufe erlauben

1. **Settings** → **Actions** → **General**.
2. Unten bei **Workflow permissions**: **Read and write permissions** wählen → **Save**.

## 5. Seite zum ersten Mal veröffentlichen

1. Reiter **Actions** → links **Seite veröffentlichen** → rechts **Run workflow** → **Run workflow**.
2. Nach 1–2 Minuten ist die Seite erreichbar unter:
   **<https://lh734.github.io/Miles-and-more/>**
   (Die genaue Adresse steht auch unter **Settings** → **Pages**.)

Ab jetzt läuft der **tägliche Lauf** automatisch. Er braucht keine KI und kein Kontingent.

## 6. Claude-Token für den KI-Lauf auf GitHub hinterlegen

Der KI-Lauf auf GitHub nutzt dein Claude-Abo und rechnet nicht über die API ab.

1. Auf dem Mac das Programm **Terminal** öffnen.
2. Falls Claude Code noch nicht installiert ist:
   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   ```
3. Token erzeugen:
   ```bash
   claude setup-token
   ```
   Es öffnet sich der Browser zur Anmeldung. Danach zeigt das Terminal einen langen Token (beginnt mit `sk-ant-oat…`). Kopiere ihn.
   **Gib den Token niemandem weiter und füge ihn nirgends sonst ein.**
4. Auf GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Secret: den kopierten Token einfügen → **Add secret**.
5. Der Token gilt **ein Jahr**. Trage das Ablaufdatum in `config/settings.json` bei `"tokenExpiresOn"` ein, z. B. `"2027-10-01"`.
   Die Seite warnt dann 30 Tage vorher. Danach wiederholst du einfach Schritt 3 und 4.

## 7. Ersten KI-Lauf mit Modellvergleich starten

1. **Actions** → **KI-Lauf** → **Run workflow**.
2. Bei **Vergleichsmodell** `claude-haiku-4-5-20251001` eintragen → **Run workflow**.
3. Nach dem Lauf (5–20 Minuten) auf den Lauf klicken. Unter **Summary** stehen die Ergebnisse,
   die Zahl der Websuchen und die Tabelle **Modellvergleich**.

Danach läuft der KI-Lauf automatisch **am 1. jedes Monats** (04:43 Uhr UTC, also 06:43 Uhr MESZ bzw. 05:43 Uhr MEZ).

## 8. KI-Lauf lokal auf dem Mac (`/meilen-update`)

Einmalig vorbereiten:

```bash
# Node.js installieren (falls noch nicht vorhanden), z. B. über https://nodejs.org (LTS-Version)
git clone https://github.com/LH734/Miles-and-more.git
cd Miles-and-more
```

Danach jedes Mal:

```bash
cd Miles-and-more
claude
```

Dann in Claude Code eingeben:

- `/meilen-update`: recherchiert, aktualisiert die Daten und pusht. Die Seite wird beim nächsten Lauf neu gebaut,
  sofort geht es über **Actions** → **Seite veröffentlichen** → **Run workflow**.
- `/meilen-update vergleich`: wie oben, zusätzlich mit dem Vergleichsmodell (Haiku). Danach siehst du die Unterschiede.

Das lokale Modell wählst du in Claude Code mit `/model`. Für den GitHub-Lauf gilt `config/settings.json`.

## 9. Einstellungen ändern

Alles steht in **`config/settings.json`**. Du kannst die Datei direkt auf GitHub bearbeiten (Datei öffnen → Stift-Symbol → **Commit changes**).

| Einstellung | Bedeutung |
|---|---|
| `ai.model` | Modell für den GitHub-KI-Lauf (Standard: `claude-sonnet-5-5`) |
| `ai.compareModel` | Modell für Vergleichsläufe |
| `ai.maxSearchesPerRun` | Obergrenze Websuchen pro Lauf (Start: 40) |
| `ai.maxFetchesPerRun` | Obergrenze Seitenabrufe pro Lauf |
| `ai.priceMaxAgeDays` | Ab diesem Alter (in Tagen) wird ein Barpreis neu gesucht |
| `ai.tokenExpiresOn` | Ablaufdatum deines Claude-Tokens (für die Warnung) |
| `value.plausibilityMax` | Werte darüber (Standard 0,15 €/Meile) werden rot markiert |
| `value.filterThresholds` | Stufen im Filter Wert/Meile |
| `relevance` | Formel für die Relevanz 1–5: Gewichte und Stufen für Wert/Meile, Zuzahlung und Restlaufzeit |

**Zeitpläne** ändern: in `.github/workflows/daily.yml` bzw. `ai-update.yml` die Zeile `cron:`.
Format: `Minute Stunde Tag Monat Wochentag` in UTC. Beispiel: `'43 4 1 * *'` = am 1. jedes Monats um 04:43 UTC.

## 10. Was wo liegt

| Pfad | Inhalt |
|---|---|
| `data/offers.json` | aktuelle Angebote |
| `data/sources.json` | Quellen mit Status |
| `data/award-chart.json` | feste Prämientabelle mit Stand-Datum |
| `data/meta.json` | Datum der letzten Läufe |
| `data/last-ai-run.json` | Protokoll des letzten KI-Laufs (auch verworfene Angebote mit Grund) |
| `data/expired.json` | entfernte, abgelaufene Angebote (Archiv) |
| `ai/ANWEISUNG.md` | Anweisung für den KI-Lauf (lokal und auf GitHub dieselbe) |
| `docs/DATENMODELL.md` | Aufbau der Daten, auch für spätere Erweiterungen |

## Hilfe bei Problemen

- **Seite zeigt „Derzeit liegen keine bestätigten, buchbaren Angebote vor“**: Es gab noch keinen erfolgreichen KI-Lauf,
  oder alle Angebote sind abgelaufen. Starte den KI-Lauf (Schritt 7 oder 8).
- **KI-Lauf bricht mit „Secret CLAUDE_CODE_OAUTH_TOKEN fehlt“ ab**: Schritt 6 wiederholen. Der Name muss genau stimmen.
- **KI-Lauf schlägt mit Anmeldefehler fehl**: Der Token ist abgelaufen oder ungültig. Schritt 6 wiederholen.
- **„Permission denied“ beim Push in Actions**: Schritt 4 prüfen.
- **Zeitplan läuft nicht**: GitHub startet Zeitpläne nur auf dem Standard-Branch (Schritt 2).
  Zeitpläne starten oft einige Minuten später als eingestellt, das ist normal.
- **Eine Quelle ist rot**: Die Seite zeigt weiter die letzten Daten dieser Quelle mit Datum. Beim nächsten KI-Lauf wird es erneut versucht.
