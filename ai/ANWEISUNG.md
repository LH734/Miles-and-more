# KI-Lauf: Miles-&-More-Einlöse-Angebote aktualisieren

Diese Anweisung gilt für den lokalen Befehl `/meilen-update` und für den GitHub-Workflow „KI-Lauf“.
Arbeite auf Deutsch. Ziel: `data/` auf den aktuellen Stand bringen und dabei das Kontingent schonen.

## Parameter

- **AUSGABE**: Datei für das Ergebnis, Standard `data/incoming/update.json`.
- **MODUS**: `lokal` (Standard) oder `ci`. Bei `ci` nichts committen oder pushen, das erledigt der Workflow.

## Grenzen

- Höchstens so viele **Websuchen** und **Seitenabrufe**, wie `scripts/ai-run-start.mjs` ausgibt (Start: 40 Suchen).
  Ein Hook zählt mit und sperrt weitere Aufrufe. Meldet er „Obergrenze erreicht“, schließe sofort mit dem Vorhandenen ab.
- Recherchiere **nur neue oder geänderte Angebote**. Unveränderte Angebote übernimmst du aus dem Bestand.
  Barpreise suchst du nur, wenn sie fehlen oder älter als `ai.priceMaxAgeDays` sind (das Startskript markiert sie).
- Beachte robots.txt und Nutzungsbedingungen. Ist ein Pfad per robots.txt gesperrt, rufe ihn nicht ab:
  Melde die Quelle mit `status: "blocked"` und `robotsAllowed: false`.
- Keine Logins, keine bezahlten Dienste. Dynamische Lufthansa-, SWISS- und Austrian-Preise (nur mit Login sichtbar) gehören nicht dazu.
- Übernimm keine Texte aus Blogs, nur Fakten und den Link zum Original. `notes` schreibst du in eigenen Worten und kurz.

## Ablauf

1. `node scripts/ai-run-start.mjs` ausführen. Es setzt die Zähler zurück und zeigt Quellen, Bestand und offene Aufgaben.
2. **robots.txt** prüfen, wo das Startskript „jetzt prüfen“ anzeigt: ein `WebFetch` je Domain.
3. **Primärquellen** abrufen (URLs in `data/sources.json`, Typ `primary`):
   Meilenschnäppchen, Award Flight Favoriten, Award Flight Specials und befristete Aktionen.
   Erfasse je Airline, Ziel, Abflughafen, Klasse und Reiseart: Meilen, Standardmeilen (falls genannt), Zuzahlung (falls genannt),
   Buchungszeitraum und Reisezeitraum. Gilt ein Angebot für mehrere deutsche Abflughäfen, lege je Abflughafen einen Eintrag an.
   Angebote mit Start im Ausland nimmst du ebenfalls auf (z. B. ab BRU, WAW, ZAG). Die Seite kennzeichnet sie automatisch.
4. **Blogs** (Typ `blog`) nur als Hinweisgeber: Suche dort nach Angeboten, die du an der Primärquelle noch nicht gefunden hast.
   Ein Blog-Angebot übernimmst du nur, wenn
   - Buchungszeitraum und Meilenpreis an der Primärquelle bestätigt sind
     (`verification.primaryConfirmed: true`, dazu `primaryUrl` und `checkedAt`), oder
   - ein eindeutiges, noch nicht abgelaufenes Buchungs-Enddatum genannt ist (`bookingPeriod.toExplicit: true`).
   Sonst kommt es mit Grund in `discarded`. Das Programm prüft die Regel zusätzlich und verwirft Verstöße.
5. **Barpreise** für neue Angebote und für markierte Preise: aktueller Preis derselben Strecke, Klasse und Reiseart
   für ein Datum im Reisezeitraum (Google Flights, Kayak, Skyscanner, Airline-Seite).
   Nur konkret gefundene Preise mit URL und Abrufdatum, immer `approx: true`. Findest du nichts Passendes: `cashPrice: null`.
   **Niemals schätzen.** Ein Preis einer anderen Strecke, Klasse oder Reiseart ist ungültig.
6. **Prämientabelle** (`data/award-chart.json`): Nur wenn `rows` leer ist oder `stand` älter als 180 Tage, lies die offizielle Tabelle
   (URL in der Datei) und trage Strecke und Meilen je Klasse ein. `stand` setzt du auf das Datum der Tabelle.
   Diese Datei bearbeitest du direkt.
7. Schreibe das Ergebnis nach **AUSGABE** (Aufbau siehe unten) und führe dann aus:
   `node scripts/apply-update.mjs <AUSGABE>`.
   Meldet das Skript abgelehnte Angebote (✗), korrigiere die Datei und führe es erneut aus.
8. `npm test` und `npm run build` ausführen. Beides muss fehlerfrei durchlaufen.
9. `node scripts/ai-run-end.mjs` ausführen und die Zahl der Websuchen nennen.
10. Nur bei MODUS `lokal`: `git add data && git commit -m "KI-Lauf: Angebote aktualisiert" && git push`.

## Aufbau der Ergebnisdatei

```json
{
  "runAt": "2026-10-01T08:00:00Z",
  "model": "<Modell>",
  "searchesUsed": 12,
  "sources": [
    { "id": "mm-meilenschnaeppchen", "status": "ok", "message": null, "robotsAllowed": true }
  ],
  "offers": [
    {
      "category": "flight",
      "offerType": "meilenschnaeppchen",
      "sourceId": "mm-meilenschnaeppchen",
      "airline": { "code": "SN", "name": "Brussels Airlines" },
      "origin": { "iata": "FRA", "city": "Frankfurt", "country": "DE" },
      "destination": { "iata": "JFK", "city": "New York", "country": "US", "countryName": "USA", "region": "Nordamerika" },
      "tripType": "roundtrip",
      "cabin": "economy",
      "miles": 42000,
      "standardMiles": 70000,
      "copay": { "amount": 350, "currency": "EUR", "source": { "name": "Miles & More", "url": "https://…" }, "retrievedAt": "2026-10-01" },
      "cashPrice": { "amount": 520, "currency": "EUR", "approx": true, "tripType": "roundtrip", "cabin": "economy",
                     "source": { "name": "Google Flights", "url": "https://…" }, "retrievedAt": "2026-10-01" },
      "bookingPeriod": { "from": "2026-10-01", "to": "2026-10-31", "toExplicit": true },
      "travelPeriod": { "from": "2026-11-01", "to": "2026-12-15" },
      "sources": [{ "type": "primary", "name": "Miles & More", "url": "https://…", "retrievedAt": "2026-10-01" }],
      "verification": { "primaryConfirmed": true, "primaryUrl": "https://…", "checkedAt": "2026-10-01" },
      "notes": null
    }
  ],
  "discarded": [{ "title": "…", "url": "https://…", "reason": "…" }]
}
```

Regeln für die Felder:

- `sources[].status`: `ok` (Abruf erfolgreich), `error` (fehlgeschlagen) oder `blocked` (robots.txt/AGB/Sperre).
  Nur bei `ok` werden die Angebote dieser Quelle ersetzt. Sonst bleiben die alten Daten mit Warnhinweis stehen.
  Melde deshalb jede Quelle, die du versucht hast. Liefert eine Quelle `ok`, gib **alle** ihre aktuellen Angebote an,
  auch die unveränderten aus dem Bestand. Was fehlt, gilt als entfernt.
- `sourceId` muss eine ID aus `data/sources.json` sein.
- `cabin`: `economy`, `premium_economy`, `business` oder `first`. `tripType`: `roundtrip` oder `oneway`.
- `destination.region`: `Deutschland`, `Europa`, `Nordafrika`, `Naher Osten`, `Afrika`, `Nordamerika`,
  `Mittelamerika & Karibik`, `Südamerika`, `Asien`, `Indischer Subkontinent` oder `Ozeanien`.
- Datumsangaben im Format `JJJJ-MM-TT`. Ländercodes nach ISO-2. Beträge in EUR.
- Unsichere Angaben werden zu `null` oder kommen in `discarded`, nie geraten.
