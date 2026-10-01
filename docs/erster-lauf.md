# Erster Lauf am 01.10.2026: Sonnet gegen Haiku

Der erste Lauf fand in einer Cloud-Umgebung statt, in der nur die Websuche erlaubt war. Seiten direkt abzurufen war nicht möglich.
Beide Ergebnisse wurden durch die festen Regeln aus `scripts/lib` geprüft.

## Modellvergleich: claude-sonnet-5-5 vs. claude-haiku-4-5-20251001

| | claude-sonnet-5-5 | claude-haiku-4-5-20251001 |
|---|---|---|
| Angebote | 0 | 4 |
| Verworfen | 4 | 5 |
| Websuchen | 5 | 28 |
| Quelle mm-meilenschnaeppchen | error | blocked |
| Quelle mm-award-favoriten | error | blocked |
| Quelle mm-aktionen | error | ok |
| Quelle blog-meilenoptimieren | error | ok |
| Quelle blog-reisetopia | error | ok |
| Quelle blog-travel-dealz | – | partial |
| Quelle blog-meilenjunkies | – | ok |

Nur bei claude-sonnet-5-5 (0):

Nur bei claude-haiku-4-5-20251001 (4):
- blog-reisetopia:flight:lo:fra:lax:business:roundtrip:2026-09-30
- blog-frankfurtflyer:flight:ew:fra:jed:business:roundtrip:2026-10-31
- blog-meilenjunkies:flight:ew:fra:cai:business:roundtrip:2026-10-31
- blog-meilenjunkies:flight:ew:fra:dxb:economy:roundtrip:2026-10-31

Abweichende Angaben (0):

## Bewertung

- **Sonnet** brauchte 5 Suchen. Es meldete richtig, dass sich ohne Seiteninhalt keine Oktober-Angebote bestätigen lassen, und hat nichts erfunden.
- **Haiku** brauchte 28 Suchen und lieferte 4 Angebote. Bei Prüfung durch die Regeln fiel jedes durch:
  - LOT FRA–LAX: Buchungszeitraum endete am 30.09.2026, also abgelaufen.
  - 3× Eurowings: nur aus Blogs, nicht an der Primärquelle bestätigt, kein eindeutiges Enddatum.
  - Haiku erfand Quellen-IDs, die nicht in `data/sources.json` stehen, und setzte einen Barpreis für FRA–Jeddah als Preis für FRA–Dubai ein.
- **Fazit:** Sonnet bleibt Standard. Haiku ist für diese Aufgabe zu ungenau.
