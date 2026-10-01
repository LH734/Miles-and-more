# Datenmodell

Alle Daten liegen als JSON in `data/`. Die Seite (`_site/data.json`) wird daraus bei jedem Lauf neu berechnet.

## Angebot (`data/offers.json` → `offers[]`)

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | automatisch | `quelle:kategorie:airline:von:nach:klasse:reiseart:buchbar-bis` |
| `category` | ja | `flight`; vorbereitet: `upgrade`, `hotel`, `sachpraemie` |
| `offerType` | – | `meilenschnaeppchen`, `award-favorit`, `aktion`, `standard` |
| `sourceId` | ja | ID aus `data/sources.json` |
| `airline` | bei Flug | `{ code, name }` |
| `origin` / `destination` | bei Flug | `{ iata, city, country (ISO-2), countryName?, region? }` |
| `tripType` | bei Flug | `roundtrip` oder `oneway` |
| `cabin` | bei Flug | `economy`, `premium_economy`, `business`, `first` |
| `miles` | ja | Meilenpreis |
| `standardMiles` | – | regulärer Meilenpreis zum Vergleich |
| `copay` | – | Zuzahlung (Steuern/Gebühren): `{ amount, currency, source:{name,url}, retrievedAt }` |
| `cashPrice` | – | Barpreis: `{ amount, currency, approx, tripType, cabin, source:{name,url}, retrievedAt }` |
| `bookingPeriod` | ja | `{ from, to, toExplicit }`; `to: null` = ohne Enddatum |
| `travelPeriod` | – | `{ from, to }` |
| `sources` | ja | `[{ type: primary|blog, name, url, retrievedAt }]` |
| `verification` | – | `{ primaryConfirmed, primaryUrl, checkedAt }` |
| `firstSeen`, `lastConfirmed` | automatisch | erstes bzw. letztes Auftauchen |

## Feste Regeln (im Code, `scripts/lib/`)

- **Anzeige** nur, wenn der Buchungszeitraum heute läuft (`offers.mjs → isBookable`).
- **Blog-Angebote** nur mit Bestätigung an der Primärquelle oder mit eindeutigem, gültigem Enddatum (`blogRuleVerdict`).
- **Wert/Meile** = (Barpreis − Zuzahlung) / Meilen. Fehlt etwas, oder passen Währung, Klasse oder Reiseart nicht: „unbekannt“ (`value.mjs`).
- **Plausibilität**: Werte über `value.plausibilityMax` werden markiert.
- **Relevanz** 1–5 nach `config/settings.json → relevance` (`relevance.mjs`).
- **Quellenausfall**: Nur Quellen mit `status: ok` ersetzen ihre Angebote; sonst bleiben die alten Daten stehen (`merge.mjs`).
- **Start im Ausland**: Abflughafen außerhalb Deutschlands (`airports.mjs`).

## Spätere Erweiterungen

- **Upgrades, Hotels, Sachprämien**: Es gilt dasselbe Angebotsschema mit anderer `category`. Für die Kategorie werden die
  Pflichtfelder in `validateOffer` ergänzt und die Anzeige in `enrich.mjs` freigeschaltet (dort gefiltert auf `flight`).
- **Sammeln (Miles & More, Payback)**: Eigene Datei `data/earn.json` mit Einträgen wie
  `{ program, partner, type, milesPerEuro | bonusMiles, validFrom, validTo, sources[] }`, eigener Abschnitt auf der Seite.
  Dieselben Regeln für Quellen und Ablaufdatum lassen sich wiederverwenden.
