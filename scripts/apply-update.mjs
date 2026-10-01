// Übernimmt das Ergebnis eines KI-Laufs: node scripts/apply-update.mjs data/incoming/update.json
// Prüft jedes Angebot, wendet Blog-Regel und Ablaufdatum an, aktualisiert Quellenstatus und meta.json.

import { PATHS, readJson, writeJson } from './lib/io.mjs';
import { todayIn } from './lib/dates.mjs';
import { mergeUpdate } from './lib/merge.mjs';
import { readRunState } from './lib/run-state.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Aufruf: node scripts/apply-update.mjs <datei.json>');
  process.exit(1);
}

const config = readJson(PATHS.config);
const today = todayIn(config.timezone);
const update = readJson(file);
// Zeitpunkt setzt das Skript selbst; Zeitangaben der KI sind nicht verlässlich
update.runAt = new Date().toISOString();
const offersDoc = readJson(PATHS.offers);
const sourcesDoc = readJson(PATHS.sources);
const meta = readJson(PATHS.meta, {});

if (update.awardChart) {
  console.log('Hinweis: awardChart im Lauf enthalten – bitte data/award-chart.json gezielt bearbeiten, nicht automatisch überschrieben.');
}

const okIds = new Set((update.sources ?? []).filter((x) => x.status === 'ok').map((x) => x.id));
const { offers, sources, report } = mergeUpdate(
  { offers: offersDoc.offers, sources: sourcesDoc.sources }, update, today,
);

const counters = readRunState();
// Zähler des Hooks hat Vorrang; ohne Zählerdatei gilt die Angabe aus dem Lauf selbst
const counted = Boolean(counters.startedAt);
const searchesUsed = counted ? counters.searches : (update.searchesUsed ?? null);

offersDoc.offers = offers;
sourcesDoc.sources = sources;
meta.lastAiRun = {
  at: update.runAt,
  model: update.model ?? null,
  searchesUsed,
  fetchesUsed: counted ? counters.fetches : (update.fetchesUsed ?? null),
  searchLimit: config.ai.maxSearchesPerRun,
  added: report.added.length,
  changed: report.changed.length,
  removed: report.removed.length,
  rejected: report.rejected.length,
  discarded: report.discarded.length,
};

writeJson(PATHS.offers, offersDoc);
writeJson(PATHS.sources, sourcesDoc);
writeJson(PATHS.meta, meta);
writeJson(PATHS.lastRunReport, { ...meta.lastAiRun, details: report });

console.log(`KI-Lauf übernommen (${today}):`);
console.log(`  neu: ${report.added.length}, geändert: ${report.changed.length}, unverändert: ${report.unchanged}, entfernt: ${report.removed.length}`);
console.log(`  abgelehnt (ungültig): ${report.rejected.length}, verworfen (Regeln): ${report.discarded.length}`);
for (const r of report.rejected) console.log(`  ✗ ${r.id}: ${r.errors.join('; ')}`);
for (const s of sources) console.log(`  Quelle ${s.id}: ${s.status}${s.message ? ` – ${s.message}` : ''}`);
console.log(`  Websuchen in diesem Lauf: ${searchesUsed ?? 'unbekannt'} von max. ${config.ai.maxSearchesPerRun}`);
// Lücken melden, damit der KI-Lauf mit dem restlichen Suchbudget nacharbeiten kann
const gaps = offers.filter((o) => okIds.has(o.sourceId) && (!o.cashPrice || !o.travelPeriod));
if (gaps.length) {
  console.log(`\nLücken bei ${gaps.length} Angebot(en):`);
  for (const o of gaps) {
    const missing = [!o.cashPrice && 'Barpreis', !o.travelPeriod && 'Reisezeitraum'].filter(Boolean).join(', ');
    console.log(`  • ${o.id}: ${missing} fehlt`);
  }
  const left = config.ai.maxSearchesPerRun - (searchesUsed ?? 0);
  if (left > 0) {
    console.log(`  → Noch ${left} Websuchen frei: Bitte die Lücken recherchieren, die Ergebnisdatei ergänzen und apply-update erneut ausführen.`);
  }
}
if (report.rejected.length) process.exitCode = 2;
