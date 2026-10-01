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

## Suchstruktur

Grundlage ist der Testlauf vom 01.10.2026 (75 Suchen, Protokoll in `docs/suchstrategie-fable-2026-10-01.md`).

**Immer zuerst direkt abrufen (WebFetch), dann erst suchen.** Die Angebotsliste der Primärquelle wird dynamisch geladen,
und der Suchindex hinkt Tage bis Wochen hinterher. Per Websuche lassen sich Buchungszeiträume fast nie an der Primärquelle bestätigen.
Ist eine Seite per WebFetch nicht lesbar, melde die Quelle als `error` und erfinde nichts aus Suchzusammenfassungen.

Reihenfolge (Platzhalter: `{MONAT}` `{JAHR}` `{AIRLINE}` `{ZIEL}` `{MEILEN}`):

1. **Primärquellen direkt** (WebFetch): URLs aus `data/sources.json`. Zur Gegenprüfung auch die Länderseiten
   (`/at/de/`, `/ch/de/`, `/row/en/`) und die Meilenschnäppchen-Seiten der Airlines (lot.com, brusselsairlines.com, eurowings.com, luxair.lu).
   Diese nennen oft Buchungszeitraum, Reisezeitraum und Abflughäfen.
2. **Lage klären** (2–3 Suchen): `Miles & More Meilenschnäppchen {MONAT} {JAHR}`. Prüfe, ob die neue Monatsliste schon
   in Blogs steht. Mit `allowed_domains: ["miles-and-more.com"]` brachte nur diese Formulierung Primär-Snippets mit Meilenpreisen:
   `Meilenschnäppchen Reisezeitraum {RZ_VON} {RZ_BIS}`.
3. **Je Airline** (1–2 Suchen, nur wenn die Liste existiert): `{AIRLINE} Miles and More Meilenschnäppchen {MONAT} {JAHR}`.
   Nützliche Monatsbeiträge mit Zielen, Meilen, Zuzahlung und Zeiträumen gibt es bei youhavebeenupgraded.boardingarea.com,
   frankfurtflyer.de und reisetopia.de/deals. Die Beiträge direkt abrufen statt nur Snippets lesen.
4. **Primärbestätigung** einzelner Blog-Angebote: `Meilenschnäppchen {AIRLINE} {ZIEL} {MEILEN} statt …` auf miles-and-more.com.
   Es gibt selten Treffer, also höchstens 3–5 Suchen.
5. **Aktionen und Favoriten** (2 Suchen): `Award Flight Specials Aktion {MONAT} {JAHR}`. Trenne Einlöse-Aktionen von
   Sammel-Aktionen und bezahlten Upgrades; nur Einlöse-Aktionen gehören hierher.
6. **Barpreise** (1 Suche je übernommenem Angebot): `{VON} {NACH} Hin- und Rückflug {KLASSE} {REISEMONAT} {JAHR} Preis`.
   Ein „ab“-Preis ohne Klasse und Reiseart zählt nicht, dann `cashPrice: null`.

Erfahrungswerte:
- Nach etwa 25 Suchen wiederholen sich die Ergebnisse. Brich dann ab.
- **Suchzusammenfassungen vermischen Monate.** Sie stellen zum Beispiel September-Angebote als „Oktober“ dar.
  Belastbar ist nur ein ausdrücklich genanntes Buchungs-Enddatum.
- Am 1. eines Monats ist die neue Liste oft noch nirgends veröffentlicht. Findest du nur Vormonatsdaten,
  melde das in `message` und übernimm nichts.
- Nicht lohnend: Snippets von Airline-Seiten, loungerocker, smarttripz, mileguy, vielfliegertreff, flyertalk
  (veraltet oder allgemein), Varianten mit dem Folgemonat, US-Datumsformat.

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
