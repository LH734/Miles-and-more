// Bereitet die Daten für die Seite auf: nur buchbare Angebote, mit Wert/Meile, Relevanz und Kennzeichen.

import { valuePerMile } from './value.mjs';
import { relevance } from './relevance.mjs';
import { isBookable, startsAbroad, validateOffer } from './offers.mjs';
import { daysBetween } from './dates.mjs';

export function buildSiteData({ offers, sources, meta, awardChart, config, today, builtAt }) {
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const shown = [];
  let hiddenInvalid = 0;
  for (const o of offers) {
    if (o.category !== 'flight') continue; // weitere Kategorien folgen später
    if (!isBookable(o, today)) continue;
    if (validateOffer(o).length) { hiddenInvalid++; continue; }
    const v = valuePerMile(o, config);
    const rel = relevance(o, v, today, config);
    const src = sourceById.get(o.sourceId);
    shown.push({
      ...o,
      value: v,
      relevance: rel.score,
      relevanceParts: rel.parts,
      startsAbroad: startsAbroad(o),
      remainingDays: o.bookingPeriod?.to ? daysBetween(today, o.bookingPeriod.to) : null,
      sourceWarning: src && src.status !== 'ok' && src.status !== 'not-checked'
        ? { status: src.status, lastSuccess: src.lastSuccess }
        : null,
    });
  }

  const token = config.ai.tokenExpiresOn;
  return {
    builtAt,
    today,
    lastDailyRun: meta.lastDailyRun ?? null,
    lastAiRun: meta.lastAiRun ?? null,
    tokenExpiresInDays: token ? daysBetween(today, token) : null,
    sources: sources.map(({ id, name, type, url, status, lastSuccess, lastAttempt, message, robots }) => (
      { id, name, type, url, status, lastSuccess, lastAttempt, message, robots })),
    valueConfig: config.value,
    offers: shown,
    hiddenInvalid,
    awardChart: awardChart ?? null,
  };
}
