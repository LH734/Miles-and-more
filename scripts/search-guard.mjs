// Hook für Claude Code (PreToolUse auf WebSearch/WebFetch), eingetragen in .claude/settings.json.
// Zählt jede Websuche und jeden Seitenabruf und sperrt weitere, sobald die Obergrenze erreicht ist.
// Grenzen: config/settings.json (ai.maxSearchesPerRun / ai.maxFetchesPerRun),
// überschreibbar per Umgebungsvariable MAX_SEARCHES / MAX_FETCHES.
// Außerhalb eines KI-Laufs (keine Datei .ai-run/state.json) wird nichts gezählt.

import { existsSync, readFileSync } from 'node:fs';
import { PATHS, readJson } from './lib/io.mjs';
import { countToolCall } from './lib/run-state.mjs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* leere Eingabe */ }

if (!existsSync(PATHS.runState)) process.exit(0);

const config = readJson(PATHS.config);
const limits = {
  maxSearches: Number(process.env.MAX_SEARCHES ?? config.ai.maxSearchesPerRun),
  maxFetches: Number(process.env.MAX_FETCHES ?? config.ai.maxFetchesPerRun),
};

const res = countToolCall(input.tool_name, limits);
if (!res.allowed) {
  const what = res.key === 'searches' ? 'Websuchen' : 'Seitenabrufe';
  // Exit-Code 2 blockiert den Aufruf; die Meldung geht an Claude.
  console.error(`Obergrenze erreicht: ${res.limit} ${what} pro Lauf. Keine weiteren ${what}. ` +
    'Schließe den Lauf mit den vorhandenen Ergebnissen ab (fehlende Barpreise bleiben null).');
  process.exit(2);
}
process.exit(0);
