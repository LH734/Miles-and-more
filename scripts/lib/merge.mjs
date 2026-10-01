// Übernimmt das Ergebnis eines KI-Laufs in den Datenbestand.
// Nur Quellen mit status "ok" ersetzen ihre Angebote. Fällt eine Quelle aus,
// bleiben deren letzte Daten stehen (die Seite zeigt dann einen Warnhinweis).

import {
  validateOffer, offerId, blogRuleVerdict, isExpired, offerChanged,
} from './offers.mjs';

export function pruneExpired(offers, today) {
  const kept = [];
  const expired = [];
  for (const o of offers) (isExpired(o, today) ? expired : kept).push(o);
  return { kept, expired };
}

export function mergeUpdate({ offers, sources }, update, today) {
  const report = {
    added: [], changed: [], removed: [], unchanged: 0,
    rejected: [], discarded: [...(update.discarded ?? [])],
  };
  const knownIds = new Set(sources.map((s) => s.id));
  const statusById = new Map();
  for (const s of update.sources ?? []) {
    if (!knownIds.has(s.id)) {
      report.rejected.push({ id: s.id, errors: ['unbekannte Quelle (nicht in data/sources.json)'] });
      continue;
    }
    statusById.set(s.id, s);
  }

  const okSources = new Set(
    [...statusById.values()].filter((s) => s.status === 'ok').map((s) => s.id),
  );

  // Neue Angebote prüfen
  const incoming = new Map();
  for (const raw of update.offers ?? []) {
    const o = structuredClone(raw);
    o.id = offerId(o);
    const errors = validateOffer(o);
    if (!knownIds.has(o.sourceId)) errors.push(`unbekannte Quelle ${o.sourceId}`);
    else if (!okSources.has(o.sourceId)) errors.push(`Quelle ${o.sourceId} ist im Lauf nicht als "ok" gemeldet`);
    if (errors.length) { report.rejected.push({ id: o.id, errors }); continue; }

    const verdict = blogRuleVerdict(o, today);
    if (!verdict.keep) {
      report.discarded.push({ title: o.id, url: o.sources[0]?.url ?? null, reason: verdict.reason });
      continue;
    }
    if (isExpired(o, today)) {
      report.discarded.push({ title: o.id, url: o.sources[0]?.url ?? null, reason: 'Buchungszeitraum abgelaufen' });
      continue;
    }
    if (incoming.has(o.id)) {
      // Doppelte Einträge: den mit mehr Angaben behalten
      const prev = incoming.get(o.id);
      if (!prev.cashPrice && o.cashPrice) incoming.set(o.id, o);
      continue;
    }
    incoming.set(o.id, o);
  }

  const oldById = new Map(offers.map((o) => [o.id, o]));
  const result = [];

  // Angebote von Quellen ohne erfolgreichen Abruf bleiben unverändert stehen
  for (const o of offers) if (!okSources.has(o.sourceId)) result.push(o);

  for (const o of incoming.values()) {
    const old = oldById.get(o.id);
    if (old) {
      // Barpreis aus dem Bestand übernehmen, wenn der Lauf keinen neuen geliefert hat
      if (!o.cashPrice && old.cashPrice) o.cashPrice = old.cashPrice;
      if (!o.copay && old.copay) o.copay = old.copay;
      o.firstSeen = old.firstSeen ?? today;
      if (offerChanged(old, o)) report.changed.push(o.id); else report.unchanged++;
    } else {
      o.firstSeen = today;
      report.added.push(o.id);
    }
    o.lastConfirmed = today;
    result.push(o);
  }

  for (const o of offers) {
    if (okSources.has(o.sourceId) && !incoming.has(o.id)) report.removed.push(o.id);
  }

  const now = update.runAt ?? new Date().toISOString();
  const newSources = sources.map((s) => {
    const st = statusById.get(s.id);
    if (!st) return s;
    const next = { ...s, status: st.status, lastAttempt: now, message: st.message ?? null };
    if (st.status === 'ok') next.lastSuccess = now;
    if (typeof st.robotsAllowed === 'boolean') {
      next.robots = { allowed: st.robotsAllowed, checkedAt: today };
    }
    return next;
  });

  result.sort((a, b) => a.id.localeCompare(b.id));
  return { offers: result, sources: newSources, report };
}
