// Relevanz 1–5 aus Wert/Meile, Zuzahlung und Restlaufzeit.
// Formel und Stufen stehen in config/settings.json unter "relevance".

import { daysBetween } from './dates.mjs';

function scoreMin(steps, value) {
  for (const step of steps) if (value >= step.min) return step.score;
  return steps.at(-1).score;
}

function scoreMax(steps, value) {
  for (const step of steps) if (value <= step.max) return step.score;
  return steps.at(-1).score;
}

export function relevance(offer, valueInfo, today, config) {
  const r = config.relevance;
  const parts = {
    valuePerMile: valueInfo.value === null
      ? r.valuePerMile.unknownScore
      : scoreMin(r.valuePerMile.steps, valueInfo.value),
    copay: offer.copay && Number.isFinite(offer.copay.amount)
      ? scoreMax(r.copay.steps, offer.copay.amount)
      : r.copay.unknownScore,
    remainingDays: offer.bookingPeriod?.to
      ? scoreMin(r.remainingDays.steps, daysBetween(today, offer.bookingPeriod.to))
      : r.remainingDays.openEndScore,
  };

  let sum = 0;
  let weights = 0;
  for (const [key, weight] of Object.entries(r.weights)) {
    sum += weight * parts[key];
    weights += weight;
  }
  const score = Math.min(5, Math.max(1, Math.round(sum / weights)));
  return { score, parts };
}
