// Vergleicht zwei KI-Lauf-Ergebnisse (z. B. Sonnet gegen Haiku):
// node scripts/compare.mjs data/incoming/update.json data/incoming/compare.json

import { readJson } from './lib/io.mjs';
import { offerId } from './lib/offers.mjs';

export function compareRuns(a, b) {
  const index = (run) => new Map((run.offers ?? []).map((o) => [offerId(o), o]));
  const ia = index(a);
  const ib = index(b);
  const onlyA = [...ia.keys()].filter((k) => !ib.has(k));
  const onlyB = [...ib.keys()].filter((k) => !ia.has(k));
  const diffs = [];
  const fields = [
    ['Meilen', (o) => o.miles],
    ['Zuzahlung', (o) => o.copay?.amount ?? null],
    ['Barpreis', (o) => o.cashPrice?.amount ?? null],
    ['Buchbar bis', (o) => o.bookingPeriod?.to ?? null],
    ['Reisezeitraum', (o) => `${o.travelPeriod?.from ?? '?'}–${o.travelPeriod?.to ?? '?'}`],
  ];
  for (const [k, oa] of ia) {
    const ob = ib.get(k);
    if (!ob) continue;
    for (const [label, get] of fields) {
      if (get(oa) !== get(ob)) diffs.push({ id: k, field: label, a: get(oa), b: get(ob) });
    }
  }
  const status = (run) => Object.fromEntries((run.sources ?? []).map((s) => [s.id, s.status]));
  return {
    models: [a.model ?? 'A', b.model ?? 'B'],
    counts: [ia.size, ib.size],
    searches: [a.searchesUsed ?? null, b.searchesUsed ?? null],
    discarded: [(a.discarded ?? []).length, (b.discarded ?? []).length],
    sources: [status(a), status(b)],
    onlyA, onlyB, diffs,
  };
}

export function formatComparison(c) {
  const [ma, mb] = c.models;
  const lines = [
    `## Modellvergleich: ${ma} vs. ${mb}`,
    '',
    `| | ${ma} | ${mb} |`, '|---|---|---|',
    `| Angebote | ${c.counts[0]} | ${c.counts[1]} |`,
    `| Verworfen | ${c.discarded[0]} | ${c.discarded[1]} |`,
    `| Websuchen | ${c.searches[0] ?? '?'} | ${c.searches[1] ?? '?'} |`,
  ];
  for (const id of new Set([...Object.keys(c.sources[0]), ...Object.keys(c.sources[1])])) {
    lines.push(`| Quelle ${id} | ${c.sources[0][id] ?? '–'} | ${c.sources[1][id] ?? '–'} |`);
  }
  lines.push('', `Nur bei ${ma} (${c.onlyA.length}):`, ...c.onlyA.map((k) => `- ${k}`));
  lines.push('', `Nur bei ${mb} (${c.onlyB.length}):`, ...c.onlyB.map((k) => `- ${k}`));
  lines.push('', `Abweichende Angaben (${c.diffs.length}):`,
    ...c.diffs.map((d) => `- ${d.id}: ${d.field} ${d.a} ↔ ${d.b}`));
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [fa, fb] = process.argv.slice(2);
  if (!fa || !fb) {
    console.error('Aufruf: node scripts/compare.mjs <lauf-a.json> <lauf-b.json>');
    process.exit(1);
  }
  console.log(formatComparison(compareRuns(readJson(fa), readJson(fb))));
}
