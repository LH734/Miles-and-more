// Zähler für Websuchen und Seitenabrufe eines KI-Laufs (Datei .ai-run/state.json, nicht im Repo).

import { PATHS, readJson, writeJson } from './io.mjs';

export function readRunState(path = PATHS.runState) {
  return readJson(path, { searches: 0, fetches: 0, startedAt: null });
}

export function resetRunState(path = PATHS.runState) {
  const state = { searches: 0, fetches: 0, startedAt: new Date().toISOString() };
  writeJson(path, state);
  return state;
}

// Zählt einen Werkzeugaufruf und entscheidet, ob er noch erlaubt ist.
export function countToolCall(toolName, limits, path = PATHS.runState) {
  const state = readRunState(path);
  const key = toolName === 'WebSearch' ? 'searches' : toolName === 'WebFetch' ? 'fetches' : null;
  if (!key) return { allowed: true, state };
  const limit = key === 'searches' ? limits.maxSearches : limits.maxFetches;
  if (state[key] >= limit) return { allowed: false, state, key, limit };
  state[key] += 1;
  writeJson(path, state);
  return { allowed: true, state, key, limit };
}
