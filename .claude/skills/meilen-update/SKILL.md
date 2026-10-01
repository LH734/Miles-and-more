---
name: meilen-update
description: KI-Lauf für den Meilen-Einlöse-Tracker. Recherchiert aktuelle Miles-&-More-Einlöse-Angebote, aktualisiert data/ und pusht.
argument-hint: "[vergleich]"
disable-model-invocation: true
allowed-tools: WebSearch, WebFetch, Read, Write, Edit, Bash(node scripts/*), Bash(npm test), Bash(npm run build), Bash(git add *), Bash(git commit *), Bash(git push*), Bash(git pull*)
---

Führe den KI-Lauf nach `ai/ANWEISUNG.md` aus, mit MODUS `lokal` und AUSGABE `data/incoming/update.json`.
Hole vorher mit `git pull` den aktuellen Stand.

Wenn die Argumente „vergleich“ enthalten ($ARGUMENTS), mache danach einen Vergleichslauf mit dem Modell aus
`config/settings.json` → `ai.compareModel`:
1. Starte einen Subagenten mit diesem Modell. Er führt Schritt 1–6 der Anweisung aus, schreibt nach
   `data/incoming/compare.json` und führt `apply-update` NICHT aus.
2. Zeige mir das Ergebnis von `node scripts/compare.mjs data/incoming/update.json data/incoming/compare.json`
   und fasse die wichtigsten Unterschiede in wenigen Sätzen zusammen: Welche Angaben waren falsch oder fehlten?
3. Übernommen werden nur die Daten des Hauptlaufs.

Nenne am Ende: neue, geänderte und entfernte Angebote, den Status jeder Quelle und die Zahl der Websuchen.
